import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storage } from "./storage.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storageService } from "./storage/index.js";
import { 
  insertProjectSchema, 
  insertCommentSchema, 
  insertUserSchema, 
  updateUserSchema, 
  insertPortfolioSchema, 
  changePasswordSchema, 
  registrationRequestSchema, 
  registrationRequests, 
  users, 
  type RegistrationRequest, 
  type InsertRegistrationRequest, 
  insertTimelinePostSchema,
  insertSkillCategorySchema,
  insertSkillTagSchema,
  userSkillSchema,
  updateProfileSchema,
  notificationEvents,
  type NotificationEvent,
  insertDirectMessageSchema,
  type DirectMessage,
  workTypes,
  projectFiles
} from "@shared/schema";
import { ZodError, z } from "zod";
import { setupAuth } from "./auth";
import { isAdmin, canUpdateProjectStatus, canChangePassword, canAccessProject } from "./middleware/permissions";
import { comparePasswords, hashPassword } from "./auth";
import { db } from './db';
import { sendNotificationEmail } from "./mail";
import { eq, desc } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ベースURLを取得する関数
function getBaseUrl(req: Request): string {
  // アプリケーションのベースURL生成（環境に応じた適切なURLを生成）
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  
  // 環境変数からの設定を優先
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Replit環境の検出
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    return `https://${domain}`;
  }
  
  // それ以外の場合はリクエストベースで組み立て
  return `${protocol}://${host}`;
}

export async function registerRoutes(app: Express) {
  // READMEファイルを提供するエンドポイント
  app.get('/api/readme', (req: Request, res: Response) => {
    try {
      const readmePath = path.join(process.cwd(), 'README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      res.json({ content: readmeContent });
    } catch (error) {
      console.error('READMEファイルの読み込みエラー:', error);
      res.status(500).json({ error: 'READMEファイルの読み込みに失敗しました' });
    }
  });
  // Set up authentication routes and middleware
  setupAuth(app);

  const httpServer = createServer(app);

  // Get all projects (読み取り可能だがフィルタリング)
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    const allProjects = await storage.getProjects();
    
    // 管理者の場合は全プロジェクトを返す
    if (req.user.role === "ADMIN") {
      return res.json(allProjects);
    }
    
    // 一般ユーザーの場合は担当プロジェクトのみ返す
    const userId = req.user.id;
    const filteredProjects = allProjects.filter(project => 
      project.directorId === userId || 
      project.salesId === userId || 
      project.assignedUsers?.includes(userId)
    );
    
    res.json(filteredProjects);
  });

  // Get a single project (読み取り可能だが権限チェック)
  app.get("/api/projects/:id", canAccessProject, async (req, res) => {
    const projectId = Number(req.params.id);
    const project = await storage.getProject(projectId);
    
    // プロジェクトが見つからない場合は404を返す
    // （canAccessProjectミドルウェアでもチェックしているが念のため）
    if (!project) {
      return res.status(404).json({ message: "プロジェクトが見つかりません" });
    }
    
    // 一般ユーザーの場合、報酬と顧客連絡先を非表示にする
    if (!req.user || req.user.role !== "ADMIN") {
      const { totalReward, rewardRules, clientContact, ...visibleData } = project;
      return res.json({
        ...visibleData,
        // プレースホルダーを設定
        totalReward: null,
        rewardRules: null,
        clientContact: null
      });
    }
    
    // 管理者の場合は全ての情報を返す
    res.json(project);
  });

  // Create a project (管理者のみ)
  app.post("/api/projects", isAdmin, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なプロジェクトデータです", errors: error.errors });
      } else {
        res.status(500).json({ message: "プロジェクトの作成に失敗しました" });
      }
    }
  });

  // Update a project (ステータス変更は全員可能、その他は管理者のみ)
  app.patch("/api/projects/:id", canUpdateProjectStatus, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const oldProject = await storage.getProject(projectId);
      
      const projectData = {
        ...insertProjectSchema.partial().parse(req.body),
        ...(typeof req.body.rewardDistributed === 'boolean' ? { rewardDistributed: req.body.rewardDistributed } : {})
      };

      const project = await storage.updateProject(projectId, projectData);
      
      // プロジェクトにアサインされたユーザーに通知を送信
      if (projectData.assignedUsers && Array.isArray(projectData.assignedUsers)) {
        // 前のアサインユーザーとの差分を取得して新しくアサインされたユーザーを特定
        const oldAssignedUsers = oldProject?.assignedUsers || [];
        const newlyAssignedUsers = projectData.assignedUsers.filter(userId => 
          !oldAssignedUsers.includes(userId)
        );
        
        // 新しくアサインされたユーザーにメール通知
        if (newlyAssignedUsers.length > 0) {
          try {
            for (const userId of newlyAssignedUsers) {
              await storage.sendNotificationEmail(
                userId,
                "PROJECT_ASSIGNED",
                {
                  title: "プロジェクトにアサインされました",
                  message: `新しいプロジェクト「${project.name}」にあなたがアサインされました。詳細を確認してください。`,
                  link: `${getBaseUrl(req)}/projects/${project.id}`
                }
              );
              console.log(`✅ プロジェクトアサイン通知メールを送信しました: ユーザーID ${userId}、プロジェクト「${project.name}」`);
            }
          } catch (emailError) {
            console.error("プロジェクトアサイン通知メールの送信に失敗しました:", emailError);
            // メール送信エラーはプロジェクト更新自体の失敗とはしない
          }
        }
      }
      
      res.json(project);
    } catch (error) {
      console.error('Project update error:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なプロジェクトデータです", errors: error.errors });
      } else {
        res.status(500).json({ message: "プロジェクトの更新に失敗しました" });
      }
    }
  });

  // Delete a project (管理者のみ)
  app.delete("/api/projects/:id", isAdmin, async (req, res) => {
    await storage.deleteProject(Number(req.params.id));
    res.status(204).send();
  });

  // Get project comments (読み取り可能)
  app.get("/api/projects/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const comments = await storage.getProjectComments(Number(req.params.id));
    res.json(comments);
  });

  // Add a comment (認証済みユーザーが可能)
  app.post("/api/projects/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const projectId = Number(req.params.id);
      const userId = req.user.id;
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        projectId,
        userId // ログインユーザーのIDを使用
      });
      
      console.log(`新しいコメントの投稿: ProjectID=${projectId}, UserID=${userId}`);
      console.log(`コメント内容: "${commentData.content}"`);
      
      const comment = await storage.createComment(commentData);
      console.log(`コメント作成成功: CommentID=${comment.id}`);
      
      // Get the project details for notifications
      const project = await storage.getProject(projectId);
      if (!project) {
        console.error(`プロジェクト情報が見つかりません: ID=${projectId}`);
        return res.status(201).json(comment);
      }
      
      console.log(`プロジェクト情報取得: ${project.name} (ID=${project.id})`);
      
      // 現在のユーザー情報を取得
      const currentUser = await storage.getUser(userId);
      console.log(`投稿ユーザー: ${currentUser?.name || 'Unknown'} (ID=${userId})`);
      
      
      // メンションの処理
      try {
        // コメント内容から@ユーザー名のパターンを検出
        const users = await storage.getUsers();
        const mentionedUsers = new Set<number>();
        
        console.log(`コメント内容: ${commentData.content}`);
        console.log(`ユーザー一覧:`, users.map(u => ({ id: u.id, name: u.name, username: u.username })));
        
        // @ユーザー名 のパターンを検出（username優先）
        const mentionRegex = /@([^\s@]+)/g;
        let match;
        while ((match = mentionRegex.exec(commentData.content)) !== null) {
          const mentionText = match[1];
          console.log(`検出されたメンション: ${mentionText}`);
          
          // 優先的にusernameで検索し、見つからない場合はnameでも検索
          const mentionedUserByUsername = users.find(u => u.username === mentionText);
          const mentionedUserByName = users.find(u => u.name === mentionText);
          const mentionedUser = mentionedUserByUsername || mentionedUserByName;
          
          if (mentionedUser) {
            console.log(`マッチしたユーザー: ID=${mentionedUser.id}, 名前=${mentionedUser.name}, ユーザー名=${mentionedUser.username}`);
            
            if (mentionedUser.id !== userId) {
              mentionedUsers.add(mentionedUser.id);
              console.log(`メンションユーザーリストに追加: ${mentionedUser.id}`);
            } else {
              console.log(`自分自身のメンションは無視: ${mentionedUser.id}`);
            }
          } else {
            console.log(`メンションされたユーザーが見つかりません: ${mentionText}`);
          }
        }
        
        if (mentionedUsers.size > 0) {
          console.log(`メンションされたユーザー: ${Array.from(mentionedUsers).join(', ')}`);
          
          // メンションされたユーザーそれぞれに通知を送信
          for (const mentionedUserId of Array.from(mentionedUsers)) {
            console.log(`メンションユーザーID ${mentionedUserId} の通知処理を開始`);
            
            // メンションされたユーザー情報を取得して確認
            const mentionedUserInfo = await storage.getUser(mentionedUserId);
            console.log(`メンションされたユーザー情報:`, mentionedUserInfo);
            
            // ユーザーの通知設定を確認
            const notificationSettings = await storage.getUserNotificationSettings(mentionedUserId);
            console.log(`メンションユーザーの通知設定:`, notificationSettings);
            
            const commenterName = req.user.name || 'ユーザー';
            
            // アプリ内通知の処理
            if (notificationSettings?.notifyCommentMention !== false) {
              console.log(`アプリ内通知設定OK: ${mentionedUserId} に通知を送信します`);
              
              try {
                // 通知履歴を追加
                const notification = await storage.createNotificationHistory({
                  userId: mentionedUserId,
                  event: "COMMENT_MENTION",
                  title: `${commenterName}さんがあなたをメンションしました`,
                  message: `プロジェクト「${project.name}」のコメントであなたがメンションされました`,
                  link: `${getBaseUrl(req)}/projects/${projectId}#comments`
                });
                
                console.log(`✅ 通知履歴の追加に成功: ID=${notification.id}`);
              } catch (notificationError) {
                console.error(`通知の作成に失敗しました: ユーザーID ${mentionedUserId}`, notificationError);
              }
            } else {
              console.log(`アプリ内通知設定により通知はスキップされました: ユーザーID ${mentionedUserId}`);
            }
            
            // メール通知の処理
            if (notificationSettings?.emailNotifyCommentMention !== false) {
              console.log(`メール通知設定OK: ${mentionedUserId} にメールを送信します`);
              
              try {
                const mentionedUser = users.find(u => u.id === mentionedUserId);
                if (mentionedUser?.email) {
                  await sendNotificationEmail(
                    mentionedUser.email,
                    "COMMENT_MENTION",
                    {
                      title: `${commenterName}さんがあなたをメンションしました`,
                      message: `プロジェクト「${project.name}」のコメントで${commenterName}さんがあなたをメンションしました。\n\n「${commentData.content.substring(0, 100)}${commentData.content.length > 100 ? '...' : ''}」`,
                      link: `${getBaseUrl(req)}/projects/${projectId}#comments`
                    }
                  );
                  console.log(`✅ メンション通知メールを送信しました: ユーザーID ${mentionedUserId}`);
                }
              } catch (emailError) {
                console.error(`メンション通知メールの送信に失敗しました: ユーザーID ${mentionedUserId}`, emailError);
                // メール送信エラーはコメント作成自体の失敗とはしない
              }
            } else {
              console.log(`メール通知設定により通知はスキップされました: ユーザーID ${mentionedUserId}`);
            }
          }
        }
      } catch (notificationError) {
        console.error("メンション通知の処理中にエラーが発生しました:", notificationError);
        // 通知エラーはコメント作成自体の失敗とはしない
      }
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なコメントデータです", errors: error.errors });
      } else {
        console.error("Comment creation error:", error);
        res.status(500).json({ message: "コメントの作成に失敗しました" });
      }
    }
  });

  // Get all users (読み取り可能)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const users = await storage.getUsers();
    res.json(users);
  });

  // Get a single user (読み取り可能)
  app.get("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      res.status(404).json({ message: "ユーザーが見つかりません" });
      return;
    }
    res.json(user);
  });

  // Update a user (管理者のみ)
  app.patch("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), userData);
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なユーザーデータです", errors: error.errors });
      } else {
        res.status(500).json({ message: "ユーザーの更新に失敗しました" });
      }
    }
  });

  // Delete a user (管理者のみ)
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });

  // パスワード変更エンドポイント (自分のパスワードのみ変更可能)
  app.post("/api/users/:id/change-password", canChangePassword, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const user = await storage.getUser(Number(req.params.id));

      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      // 現在のパスワードを検証
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "現在のパスワードが正しくありません" });
      }

      // 新しいパスワードをハッシュ化して保存
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ message: "パスワードを変更しました" });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "入力データが無効です", errors: error.errors });
      } else {
        console.error("Password change error:", error);
        res.status(500).json({ message: "パスワードの変更に失敗しました" });
      }
    }
  });

  // Get all portfolios (読み取り可能)
  app.get("/api/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    // 公開されているポートフォリオのみを取得
    const portfolios = await storage.getPublicPortfolios();
    res.json(portfolios);
  });

  // Get user's portfolios (読み取り可能)
  app.get("/api/users/:id/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    const portfolios = await storage.getUserPortfolios(Number(req.params.id));
    
    // 本人または管理者以外の場合は、公開設定のもののみを返す
    if (req.user.id !== Number(req.params.id) && req.user.role !== "ADMIN") {
      const publicPortfolios = portfolios.filter(p => p.isPublic);
      return res.json(publicPortfolios);
    }
    
    res.json(portfolios);
  });

  // 後方互換性のため残す (空の配列を返す)
  app.get("/api/projects/:id/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const projectId = Number(req.params.id);
      const portfolios = await storage.getPortfolios(projectId);
      res.json(portfolios);
    } catch (error) {
      console.error("プロジェクトのポートフォリオ取得エラー:", error);
      res.status(500).json({ message: "ポートフォリオの取得に失敗しました" });
    }
  });

  // Get a single portfolio (読み取り可能)
  app.get("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) {
      res.status(404).json({ message: "ポートフォリオが見つかりません" });
      return;
    }
    res.json(portfolio);
  });

  // Create a portfolio (管理者は他のユーザーのポートフォリオも作成可能)
  app.post("/api/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      let portfolioData;
      
      // 管理者の場合は他のユーザーのポートフォリオも作成可能
      if (req.user.role === "ADMIN" && req.body.userId) {
        portfolioData = insertPortfolioSchema.parse(req.body);
      } else {
        // 一般ユーザーは自分のポートフォリオのみ作成可能
        portfolioData = insertPortfolioSchema.parse({
          ...req.body,
          userId: req.user.id
        });
      }

      // OGP画像URLが指定されていれば保存
      if (req.body.imageUrl) {
        portfolioData.imageUrl = req.body.imageUrl;
      }
      
      // ファイルアップロード関連のフィールドを追加
      if (req.body.filePath) {
        portfolioData.filePath = req.body.filePath;
      }
      if (req.body.fileType) {
        portfolioData.fileType = req.body.fileType;
      }
      
      // urlフィールドが未設定（nullまたはundefined）の場合、空文字列をセット
      // データベースのNOT NULL制約対応
      if (portfolioData.url === null || portfolioData.url === undefined) {
        portfolioData.url = "";
      }

      const portfolio = await storage.createPortfolio(portfolioData);
      res.status(201).json(portfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なポートフォリオデータです", errors: error.errors });
      } else {
        console.error("ポートフォリオ作成エラー:", error);
        res.status(500).json({ message: "ポートフォリオの作成に失敗しました" });
      }
    }
  });
  
  // プロジェクトに紐づくポートフォリオ作成エンドポイント
  app.post("/api/projects/:id/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const projectId = Number(req.params.id);
      
      // プロジェクトが存在するか確認
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "プロジェクトが見つかりません" });
      }
      
      let portfolioData;
      
      // 管理者の場合は他のユーザーのポートフォリオも作成可能
      if (req.user.role === "ADMIN" && req.body.userId) {
        portfolioData = insertPortfolioSchema.parse({
          ...req.body,
          projectId
        });
      } else {
        // 一般ユーザーは自分のポートフォリオのみ作成可能
        portfolioData = insertPortfolioSchema.parse({
          ...req.body,
          userId: req.user.id,
          projectId
        });
      }
      
      console.log('作成するポートフォリオデータ:', portfolioData);
      
      // ファイルアップロード関連のフィールドを追加
      if (req.body.filePath) {
        portfolioData.filePath = req.body.filePath;
      }
      if (req.body.fileType) {
        portfolioData.fileType = req.body.fileType;
      }
      if (req.body.imageUrl) {
        portfolioData.imageUrl = req.body.imageUrl;
      }
      
      // urlフィールドが未設定（nullまたはundefined）の場合、空文字列をセット
      // データベースのNOT NULL制約対応
      if (portfolioData.url === null || portfolioData.url === undefined) {
        portfolioData.url = "";
      }
      
      const portfolio = await storage.createPortfolio(portfolioData);
      
      res.status(201).json(portfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("ポートフォリオ作成バリデーションエラー:", error.errors);
        res.status(400).json({ message: "無効なポートフォリオデータです", errors: error.errors });
      } else {
        console.error("プロジェクトのポートフォリオ作成エラー:", error);
        res.status(500).json({ message: "ポートフォリオの作成に失敗しました" });
      }
    }
  });

  // Update a portfolio (自分のポートフォリオまたは管理者のみ)
  app.patch("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const portfolioId = Number(req.params.id);
      const portfolio = await storage.getPortfolio(portfolioId);
      
      if (!portfolio) {
        return res.status(404).json({ message: "ポートフォリオが見つかりません" });
      }
      
      // 自分のポートフォリオか管理者のみ許可
      if (portfolio.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "このポートフォリオを編集する権限がありません" });
      }
      
      // 独自のバリデーションスキーマを作成（全てのフィールドをオプショナル）
      const updatePortfolioSchema = z.object({
        title: z.string().min(1, "タイトルは必須です").optional(),
        description: z.string().min(1, "説明は必須です").max(500, "説明は500文字以内で入力してください").optional(),
        url: z.string().optional().default("")
          .transform(val => val === null ? "" : val) // null値を空文字列に変換
          .refine(
            (url) => {
              // 空文字列の場合は有効（ファイルアップロードモードの場合）
              if (!url || url.trim().length === 0) {
                return true;
              }
              
              // 値が入力されている場合は有効なURLかチェック
              try {
                new URL(url);
                return true;
              } catch {
                return false;
              }
            },
            {
              message: "有効なURLを入力してください"
            }
          ),
        workType: z.enum(workTypes, {
          errorMap: () => ({ message: "作業種別を選択してください" })
        }).optional(),
        projectId: z.number().int().positive().optional().nullable(), // プロジェクトID（オプション）
        imageUrl: z.string().url("有効な画像URLを入力してください").optional().nullable(),
        filePath: z.string().optional().nullable(),
        fileType: z.string().optional().nullable(),
        isPublic: z.boolean().optional()
      });
      
      // リクエストデータをバリデーション
      console.log('PATCH /api/portfolios/:id - Request body:', JSON.stringify(req.body, null, 2));
      const portfolioData = updatePortfolioSchema.parse(req.body);
      console.log('PATCH /api/portfolios/:id - Validated data:', JSON.stringify(portfolioData, null, 2));
      
      // アップデートデータからuserIdを削除（変更不可）
      if ('userId' in portfolioData && portfolioData.userId !== portfolio.userId) {
        delete portfolioData.userId;
      }
      
      // URLがnullの場合は空文字に変換
      if ('url' in portfolioData && portfolioData.url === null) {
        portfolioData.url = "";
      }
      
      const updatedPortfolio = await storage.updatePortfolio(portfolioId, portfolioData);
      res.json(updatedPortfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なポートフォリオデータです", errors: error.errors });
      } else {
        console.error("ポートフォリオ更新エラー:", error);
        res.status(500).json({ message: "ポートフォリオの更新に失敗しました" });
      }
    }
  });

  // Delete a portfolio (自分のポートフォリオまたは管理者のみ)
  app.delete("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const portfolioId = Number(req.params.id);
      const portfolio = await storage.getPortfolio(portfolioId);
      
      if (!portfolio) {
        return res.status(404).json({ message: "ポートフォリオが見つかりません" });
      }
      
      // 自分のポートフォリオか管理者のみ許可
      if (portfolio.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "このポートフォリオを削除する権限がありません" });
      }
      
      await storage.deletePortfolio(portfolioId);
      res.status(204).send();
    } catch (error) {
      console.error("ポートフォリオ削除エラー:", error);
      res.status(500).json({ message: "ポートフォリオの削除に失敗しました" });
    }
  });

  // First OGP implementation removed to fix duplicate endpoint

  // 登録リクエストの作成 (誰でも可能)
  app.post("/api/registration-request", async (req, res) => {
    try {
      const requestData = registrationRequestSchema.parse(req.body);

      // メールアドレスまたはユーザー名が既に使用されているか確認
      const existingUser = await storage.getUserByUsername(requestData.username);
      if (existingUser) {
        return res.status(400).json({ message: "このユーザー名は既に使用されています" });
      }

      const [existingEmail] = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.email, requestData.email));

      if (existingEmail) {
        return res.status(400).json({ message: "このメールアドレスは既に使用されています" });
      }

      // パスワードをハッシュ化
      const hashedPassword = await hashPassword(requestData.password);
      const request = await storage.createRegistrationRequest({
        ...requestData,
        password: hashedPassword
      });
      
      // 管理者ユーザーに通知メールを送信
      try {
        // 管理者ユーザー一覧を取得
        const adminUsers = await storage.getUsers();
        const admins = adminUsers.filter(user => user.role === "ADMIN");
        
        if (admins.length > 0) {
          for (const admin of admins) {
            // 管理者の通知設定を確認
            const adminSettings = await storage.getUserNotificationSettings(admin.id);
            
            // アプリ内通知を処理
            if (adminSettings?.notifyRegistrationRequest) {
              // 通知履歴を追加
              await storage.createNotificationHistory({
                userId: admin.id,
                event: "REGISTRATION_REQUEST",
                title: "新しい登録リクエストがあります",
                message: `「${request.name}」さんから新しい登録リクエストがありました。管理画面で確認してください。`,
                link: `${getBaseUrl(req)}/admin/registration-requests`
              });
              console.log(`✅ 登録リクエスト通知を作成しました: 管理者ID ${admin.id}`);
            }
            
            // メール通知を処理
            if (adminSettings?.emailNotifyRegistrationRequest) {
              await storage.sendNotificationEmail(
                admin.id,
                "REGISTRATION_REQUEST",
                {
                  title: "新しい登録リクエストがあります",
                  message: `「${request.name}」さんから新しい登録リクエストがありました。管理画面で確認してください。`,
                  link: `${getBaseUrl(req)}/admin/registration-requests`
                }
              );
              console.log(`✅ 登録リクエスト通知メールを送信しました: 管理者ID ${admin.id}`);
            }
          }
        }
      } catch (emailError) {
        console.error("登録リクエスト通知メールの送信に失敗しました:", emailError);
        // メール送信エラーはリクエスト登録自体の失敗とはしない
      }

      res.json({
        message: "登録リクエストを受け付けました。管理者の承認をお待ちください。",
        request: {
          ...request,
          password: undefined
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "入力データが無効です", errors: error.errors });
      } else {
        console.error("Registration request error:", error);
        res.status(500).json({ message: "登録リクエストの作成に失敗しました" });
      }
    }
  });

  // 管理者用の登録リクエスト一覧取得 (管理者のみ)
  app.get("/api/admin/registration-requests", isAdmin, async (req, res) => {
    try {
      const requests = await storage.getRegistrationRequests();
      // パスワードハッシュを除外
      const sanitizedRequests = requests.map(req => ({
        ...req,
        password: undefined
      }));
      res.json(sanitizedRequests);
    } catch (error) {
      res.status(500).json({ message: "登録リクエストの取得に失敗しました" });
    }
  });

  // 管理者用の登録リクエスト承認/拒否 (管理者のみ)
  app.post("/api/admin/registration-requests/:id/:action", isAdmin, async (req, res) => {
    try {
      const { id, action } = req.params;
      const request = await storage.getRegistrationRequest(Number(id));

      if (!request) {
        return res.status(404).json({ message: "登録リクエストが見つかりません" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "このリクエストは既に処理済みです" });
      }

      if (action === "approve") {
        // パスワードとユーザー名の重複チェック
        const existingUser = await storage.getUserByUsername(request.username);
        if (existingUser) {
          return res.status(400).json({ message: "このユーザー名は既に使用されています" });
        }

        // ユーザーを作成（createdAtは自動設定）
        const newUser = await storage.createUser({
          name: request.name,
          role: request.role,
          email: request.email,
          username: request.username,
          password: request.password,
          approved: true,
          createdAt: new Date(),
          avatarUrl: null,
          bio: null,
          title: null
        });

        await storage.updateRegistrationRequestStatus(Number(id), "APPROVED");
        
        // 登録承認通知メールを送信
        try {
          await storage.sendNotificationEmail(
            newUser.id,
            "REGISTRATION_APPROVED",
            {
              title: "登録リクエストが承認されました",
              message: `${newUser.name}さん、Yura Yura Studioへのアカウント登録が承認されました。ログインして利用を開始できます。`,
              link: `${getBaseUrl(req)}/`
            }
          );
          console.log(`✅ 登録承認通知メールを送信しました: ${newUser.email}`);
        } catch (emailError) {
          console.error("登録承認通知メールの送信に失敗しました:", emailError);
          // メール送信エラーはユーザー作成自体の失敗とはしない
        }
        
        res.json({ message: "ユーザー登録を承認しました" });
      } else if (action === "reject") {
        await storage.updateRegistrationRequestStatus(Number(id), "REJECTED");
        res.json({ message: "ユーザー登録を拒否しました" });
      } else {
        res.status(400).json({ message: "無効なアクション" });
      }
    } catch (error) {
      console.error("Registration request action error:", error);
      res.status(500).json({ message: "操作に失敗しました" });
    }
  });


  // 管理者用APIエンドポイントを追加 (管理者のみ)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "ユーザー一覧の取得に失敗しました" });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), userData);
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なユーザーデータです", errors: error.errors });
      } else {
        res.status(500).json({ message: "ユーザーの更新に失敗しました" });
      }
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "ユーザーの削除に失敗しました" });
    }
  });

  // プロフィール更新エンドポイントを修正
  app.patch("/api/users/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    try {
      console.log('リクエストボディ:', req.body);
      const profileData = updateProfileSchema.parse(req.body);
      console.log('バリデーション後のデータ:', profileData);

      await storage.updateUser(req.user.id, profileData);
      const updatedUser = await storage.getUser(req.user.id);

      console.log('更新後のユーザー:', updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "入力データが無効です", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "プロフィールの更新に失敗しました" });
      }
    }
  });

  // アバター画像アップロードエンドポイント
  app.post("/api/users/avatar", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ message: "画像ファイルが必要です" });
    }

    try {
      const avatarFile = req.files.avatar;
      const fileName = `avatar-${req.user.id}-${Date.now()}.${avatarFile.name.split('.').pop()}`;
      
      console.log("アバター画像をObject Storageにアップロード:", fileName);
      
      // Object Storageにアップロード
      const uploadResult = await storageService.uploadFile(
        avatarFile.data,
        fileName,
        avatarFile.mimetype
      );

      await storage.updateUser(req.user.id, { avatarUrl: uploadResult.url });
      res.json({ url: uploadResult.url });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ message: "画像のアップロードに失敗しました" });
    }
  });
  
  // ポートフォリオファイルアップロードエンドポイント
  app.post("/api/portfolios/upload", async (req, res) => {
    console.log("ファイルアップロードリクエスト受信");
    
    if (!req.isAuthenticated()) {
      console.log("認証エラー: ユーザーが認証されていません");
      return res.status(401).json({ message: "認証が必要です" });
    }

    console.log("認証ユーザー:", req.user?.id, req.user?.name);
    
    // リクエストのファイル情報を確認
    console.log("リクエスト本文:", req.body);
    console.log("files オブジェクト:", req.files ? Object.keys(req.files) : 'なし');
    
    if (!req.files || !req.files.file) {
      console.log("エラー: ファイルが見つかりません", req.files);
      return res.status(400).json({ message: "ファイルが必要です" });
    }

    try {
      const portfolioFile = req.files.file;
      console.log("ファイル情報:", {
        name: portfolioFile.name,
        size: portfolioFile.size,
        mimetype: portfolioFile.mimetype,
        md5: portfolioFile.md5,
        encoding: portfolioFile.encoding
      });
      
      const fileType = portfolioFile.mimetype;
      
      // サポートされているファイル形式のリスト
      const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/msword', // doc
        'application/vnd.ms-powerpoint', // ppt
        'application/vnd.ms-excel', // xls
        'text/plain', // txt
        'application/zip', // zip
        'application/x-rar-compressed', // rar
        'application/octet-stream', // 一般的なバイナリファイル（拡張子で判断する場合）
      ];
      
      // MIMEタイプが不明な場合は拡張子でチェック
      const fileExt = portfolioFile.name.split('.').pop()?.toLowerCase() || '';
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'];
      
      console.log("ファイルタイプチェック:", fileType, fileExt);
      
      // MIMEタイプまたは拡張子のいずれかが許可リストに含まれていることを確認
      if (!allowedTypes.includes(fileType) && !allowedExtensions.includes(fileExt)) {
        console.log("エラー: サポートされていないファイル形式", fileType, fileExt);
        return res.status(400).json({ 
          message: "このファイル形式はサポートされていません", 
          allowedTypes: "PDF, JPEG, PNG, GIF, WEBP, Word, Excel, PowerPoint, テキスト, ZIP, RAR" 
        });
      }
      
      // 安全なファイル名を生成
      const sanitizedName = portfolioFile.name
        .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        .replace(/\s+/g, '_');
      
      const fileName = `portfolio-${req.user.id}-${Date.now()}-${sanitizedName}`;
      
      console.log("ポートフォリオファイルをObject Storageにアップロード:", fileName);

      try {
        // Object Storageにアップロード
        const uploadResult = await storageService.uploadFile(
          portfolioFile.data,
          fileName,
          portfolioFile.mimetype
        );
        
        console.log("Object Storageアップロード成功:", uploadResult.filename);
        
        const filePath = uploadResult.url;
        
        // プレビュー画像URL（PDFやドキュメントの場合はデフォルト画像を使用）
        let previewImageUrl = null;
      
      if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
        // 画像ファイルの場合はそのままプレビューに使用
        previewImageUrl = filePath;
      } else if (fileType === 'application/pdf' || fileExt === 'pdf') {
        // PDFのデフォルトアイコン
        previewImageUrl = '/assets/icons/pdf-icon.svg';
      } else if (fileType.includes('word') || fileType.includes('document') || ['doc', 'docx'].includes(fileExt)) {
        // Wordのデフォルトアイコン
        previewImageUrl = '/assets/icons/word-icon.svg';
      } else if (fileType.includes('excel') || fileType.includes('spreadsheet') || ['xls', 'xlsx'].includes(fileExt)) {
        // Excelのデフォルトアイコン
        previewImageUrl = '/assets/icons/excel-icon.svg';
      } else if (fileType.includes('powerpoint') || fileType.includes('presentation') || ['ppt', 'pptx'].includes(fileExt)) {
        // PowerPointのデフォルトアイコン
        previewImageUrl = '/assets/icons/powerpoint-icon.svg';
      } else {
        // その他のファイル
        previewImageUrl = '/assets/icons/file-icon.svg';
      }
      
        console.log("レスポンス:", {
          message: "ファイルをアップロードしました",
          filePath,
          fileType,
          previewImageUrl
        });

        res.json({
          message: "ファイルをアップロードしました",
          filePath,
          fileType,
          previewImageUrl
        });
      } catch (mvError: any) {
        console.error("Object Storageアップロードエラー:", mvError);
        return res.status(500).json({ message: "ファイルの保存に失敗しました", error: mvError?.message || String(mvError) });
      }
    } catch (error) {
      console.error("ポートフォリオファイルアップロードエラー:", error);
      res.status(500).json({ 
        message: "ファイルのアップロードに失敗しました", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Timeline API endpoints
  // Get all timeline posts
  app.get("/api/timeline", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const posts = await storage.getTimelinePosts();
      
      // Get user information for each post
      const postsWithUserInfo = await Promise.all(
        posts.map(async (post) => {
          const user = await storage.getUser(post.userId);
          return {
            ...post,
            user: user ? {
              id: user.id,
              name: user.name,
              username: user.username,
              avatarUrl: user.avatarUrl
            } : null
          };
        })
      );
      
      res.json(postsWithUserInfo);
    } catch (error) {
      console.error("Timeline fetch error:", error);
      res.status(500).json({ message: "タイムラインの取得に失敗しました" });
    }
  });

  // Get timeline posts by user ID
  app.get("/api/timeline/user/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const posts = await storage.getTimelinePostsByUser(Number(req.params.userId));
      
      // Get user information
      const user = await storage.getUser(Number(req.params.userId));
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }
      
      const postsWithUserInfo = posts.map(post => ({
        ...post,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl
        }
      }));
      
      res.json(postsWithUserInfo);
    } catch (error) {
      console.error("User timeline fetch error:", error);
      res.status(500).json({ message: "ユーザータイムラインの取得に失敗しました" });
    }
  });

  // Create a new timeline post
  app.post("/api/timeline", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const postData = insertTimelinePostSchema.parse({
        ...req.body,
        userId: req.user.id // Use the authenticated user's ID
      });
      
      const post = await storage.createTimelinePost(postData);
      
      // Include user info in the response
      const user = req.user ? await storage.getUser(req.user.id) : null;
      const postWithUser = {
        ...post,
        user: user ? {
          id: user.id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl
        } : null
      };
      
      res.status(201).json(postWithUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効な投稿データです", errors: error.errors });
      } else {
        console.error("Timeline post creation error:", error);
        res.status(500).json({ message: "投稿の作成に失敗しました" });
      }
    }
  });

  // Delete a timeline post (only the author or admin can delete)
  app.delete("/api/timeline/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const postId = Number(req.params.id);
      const post = await storage.getTimelinePost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "投稿が見つかりません" });
      }
      
      // Only the author or an admin can delete the post
      if (post.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "この操作を行う権限がありません" });
      }
      
      await storage.deleteTimelinePost(postId);
      res.status(204).send();
    } catch (error) {
      console.error("Timeline post deletion error:", error);
      res.status(500).json({ message: "投稿の削除に失敗しました" });
    }
  });
  
  // ====== Skills API endpoints ======
  
  // Get all skill categories with tags
  app.get("/api/skills/categories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const categories = await storage.getSkillCategories();
      const tags = await storage.getSkillTags();
      
      // カテゴリーとタグを結合
      const categoriesWithTags = categories.map(category => {
        const categoryTags = tags.filter(tag => tag.categoryId === category.id);
        return {
          ...category,
          tags: categoryTags
        };
      });
      
      res.json(categoriesWithTags);
    } catch (error) {
      console.error("Error fetching skill categories:", error);
      res.status(500).json({ message: "スキルカテゴリの取得に失敗しました" });
    }
  });
  
  // Get a specific skill category with its tags
  app.get("/api/skills/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const categoryId = Number(req.params.id);
      const category = await storage.getSkillCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "スキルカテゴリが見つかりません" });
      }
      
      const tags = await storage.getSkillTagsByCategory(categoryId);
      
      res.json({
        ...category,
        tags
      });
    } catch (error) {
      console.error("Error fetching skill category:", error);
      res.status(500).json({ message: "スキルカテゴリの取得に失敗しました" });
    }
  });
  
  // Create a new skill category (admin only)
  app.post("/api/skills/categories", isAdmin, async (req, res) => {
    try {
      const categoryData = insertSkillCategorySchema.parse(req.body);
      const newCategory = await storage.createSkillCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なカテゴリデータです", errors: error.errors });
      } else {
        console.error("Skill category creation error:", error);
        res.status(500).json({ message: "スキルカテゴリの作成に失敗しました" });
      }
    }
  });
  
  // Update a skill category (admin only)
  app.put("/api/skills/categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const category = await storage.getSkillCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "スキルカテゴリが見つかりません" });
      }
      
      const categoryData = insertSkillCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateSkillCategory(categoryId, categoryData);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なカテゴリデータです", errors: error.errors });
      } else {
        console.error("Skill category update error:", error);
        res.status(500).json({ message: "スキルカテゴリの更新に失敗しました" });
      }
    }
  });
  
  // Delete a skill category (admin only)
  app.delete("/api/skills/categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const category = await storage.getSkillCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "スキルカテゴリが見つかりません" });
      }
      
      await storage.deleteSkillCategory(categoryId);
      res.status(204).send();
    } catch (error) {
      console.error("Skill category deletion error:", error);
      res.status(500).json({ message: "スキルカテゴリの削除に失敗しました" });
    }
  });
  
  // Get all skill tags
  app.get("/api/skills/tags", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const tags = await storage.getSkillTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching skill tags:", error);
      res.status(500).json({ message: "スキルタグの取得に失敗しました" });
    }
  });
  
  // Get skill tags by category
  app.get("/api/skills/categories/:id/tags", async (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const category = await storage.getSkillCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "スキルカテゴリが見つかりません" });
      }
      
      const tags = await storage.getSkillTagsByCategory(categoryId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching skill tags by category:", error);
      res.status(500).json({ message: "スキルタグの取得に失敗しました" });
    }
  });
  
  // Create a new skill tag (admin only)
  app.post("/api/skills/tags", isAdmin, async (req, res) => {
    try {
      const tagData = insertSkillTagSchema.parse(req.body);
      
      // カテゴリが存在するか確認
      const category = await storage.getSkillCategory(tagData.categoryId);
      if (!category) {
        return res.status(404).json({ message: "指定されたカテゴリが見つかりません" });
      }
      
      const newTag = await storage.createSkillTag(tagData);
      res.status(201).json(newTag);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なタグデータです", errors: error.errors });
      } else {
        console.error("Skill tag creation error:", error);
        res.status(500).json({ message: "スキルタグの作成に失敗しました" });
      }
    }
  });
  
  // Update a skill tag (admin only)
  app.put("/api/skills/tags/:id", isAdmin, async (req, res) => {
    try {
      const tagId = Number(req.params.id);
      const tag = await storage.getSkillTag(tagId);
      
      if (!tag) {
        return res.status(404).json({ message: "スキルタグが見つかりません" });
      }
      
      const tagData = insertSkillTagSchema.partial().parse(req.body);
      
      // カテゴリIDが変更される場合、そのカテゴリが存在するか確認
      if (tagData.categoryId && tagData.categoryId !== tag.categoryId) {
        const category = await storage.getSkillCategory(tagData.categoryId);
        if (!category) {
          return res.status(404).json({ message: "指定されたカテゴリが見つかりません" });
        }
      }
      
      const updatedTag = await storage.updateSkillTag(tagId, tagData);
      res.json(updatedTag);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なタグデータです", errors: error.errors });
      } else {
        console.error("Skill tag update error:", error);
        res.status(500).json({ message: "スキルタグの更新に失敗しました" });
      }
    }
  });
  
  // Delete a skill tag (admin only)
  app.delete("/api/skills/tags/:id", isAdmin, async (req, res) => {
    try {
      const tagId = Number(req.params.id);
      const tag = await storage.getSkillTag(tagId);
      
      if (!tag) {
        return res.status(404).json({ message: "スキルタグが見つかりません" });
      }
      
      await storage.deleteSkillTag(tagId);
      res.status(204).send();
    } catch (error) {
      console.error("Skill tag deletion error:", error);
      res.status(500).json({ message: "スキルタグの削除に失敗しました" });
    }
  });
  
  // Get user skills
  app.get("/api/users/:id/skills", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }
      
      const userSkills = await storage.getUserSkills(userId);
      const skillTagIds = userSkills.map(skill => skill.skillTagId);
      
      // スキルの詳細情報を取得
      const allTags = await storage.getSkillTags();
      const allCategories = await storage.getSkillCategories();
      
      const userSkillDetails = userSkills.map(skill => {
        const tag = allTags.find(t => t.id === skill.skillTagId);
        const category = tag ? allCategories.find(c => c.id === tag.categoryId) : null;
        
        return {
          ...skill,
          tag,
          category
        };
      });
      
      res.json({
        userId,
        skills: userSkillDetails,
        skillTagIds
      });
    } catch (error) {
      console.error("Error fetching user skills:", error);
      res.status(500).json({ message: "ユーザースキルの取得に失敗しました" });
    }
  });
  
  // Update user skills
  app.put("/api/users/:id/skills", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const userId = Number(req.params.id);
      
      // 自分自身のスキルのみ更新可能
      if (req.user.id !== userId && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "この操作を行う権限がありません" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }
      
      const updateData = userSkillSchema.parse(req.body);
      
      // 全てのスキルタグIDが存在するか確認
      const allTags = await storage.getSkillTags();
      const tagIds = allTags.map(tag => tag.id);
      
      for (const skillTagId of updateData.skillTagIds) {
        if (!tagIds.includes(skillTagId)) {
          return res.status(404).json({ message: `スキルタグID ${skillTagId} が見つかりません` });
        }
      }
      
      await storage.updateUserSkills({
        userId,
        skillTagIds: updateData.skillTagIds
      });
      
      res.status(200).json({ message: "ユーザースキルを更新しました" });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なスキルデータです", errors: error.errors });
      } else {
        console.error("User skills update error:", error);
        res.status(500).json({ message: "ユーザースキルの更新に失敗しました" });
      }
    }
  });

  // 報酬分配関連のエンドポイント

  // プロジェクトの報酬分配情報を取得
  app.get("/api/projects/:id/reward-distribution", canAccessProject, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const distribution = await storage.getRewardDistribution(projectId);
      
      if (!distribution) {
        // デフォルト値を返す
        return res.json({
          projectId,
          operationPercentage: 10,
          salesPercentage: 15,
          directorPercentage: 25,
          creatorPercentage: 50
        });
      }
      
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching reward distribution:", error);
      res.status(500).json({ message: "報酬分配情報の取得に失敗しました" });
    }
  });

  // 報酬分配情報を更新（管理者のみ）
  app.post("/api/projects/:id/reward-distribution", isAdmin, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "プロジェクトが見つかりません" });
      }
      
      // すでに報酬が分配済みの場合は更新不可
      if (project.rewardDistributed) {
        return res.status(400).json({ message: "すでに報酬が分配済みのプロジェクトです" });
      }
      
      const data = {
        projectId,
        salesPercentage: req.body.salesPercentage,
        directorPercentage: req.body.directorPercentage,
        creatorPercentage: req.body.creatorPercentage
      };
      
      // 既存の報酬分配情報を確認
      const existingDistribution = await storage.getRewardDistribution(projectId);
      
      let distribution;
      if (existingDistribution) {
        distribution = await storage.updateRewardDistribution(projectId, data);
      } else {
        distribution = await storage.createRewardDistribution(data);
      }
      
      res.json(distribution);
    } catch (error) {
      console.error("Error updating reward distribution:", error);
      res.status(500).json({ message: "報酬分配情報の更新に失敗しました" });
    }
  });

  // ユーザーの報酬情報を取得
  app.get("/api/users/:id/rewards/project/:projectId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    const userId = Number(req.params.id);
    const projectId = Number(req.params.projectId);
    
    // 自分自身の報酬情報か管理者のみ閲覧可能
    if (userId !== req.user?.id && req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "権限がありません" });
    }
    
    try {
      const rewardInfo = await storage.calculateUserReward(projectId, userId);
      
      if (!rewardInfo) {
        return res.status(404).json({ message: "報酬情報が見つかりません" });
      }
      
      res.json(rewardInfo);
    } catch (error) {
      console.error("Error calculating user reward:", error);
      res.status(500).json({ message: "報酬情報の計算に失敗しました" });
    }
  });

  // ユーザーに関連するすべてのプロジェクトの報酬情報を取得
  app.get("/api/users/:id/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    const userId = Number(req.params.id);
    
    // 自分自身の報酬情報か管理者のみ閲覧可能
    if (userId !== req.user?.id && req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "権限がありません" });
    }
    
    try {
      // ユーザーに関連するプロジェクトを取得
      const allProjects = await storage.getProjects();
      const userProjects = allProjects.filter(project => 
        project.directorId === userId || 
        project.salesId === userId || 
        (project.assignedUsers && project.assignedUsers.includes(userId))
      );
      
      // 各プロジェクトの報酬情報を計算
      const rewards = await Promise.all(
        userProjects.map(async project => {
          const rewardInfo = await storage.calculateUserReward(project.id, userId);
          return {
            projectId: project.id,
            projectName: project.name,
            ...rewardInfo
          };
        })
      );
      
      // 結果から undefined を除去
      const validRewards = rewards.filter(reward => reward !== undefined);
      
      res.json(validRewards);
    } catch (error) {
      console.error("Error calculating user rewards:", error);
      res.status(500).json({ message: "報酬情報の計算に失敗しました" });
    }
  });

  // OGP情報を取得するエンドポイント - 公開エンドポイントに変更（認証不要）
  app.get("/api/ogp", async (req, res) => {
    try {
      const url = req.query.url as string;
      
      // URLパラメータがない場合はデフォルトのOGP画像を返す
      if (!url) {
        return res.json({
          imageUrl: "/ogp.png"
        });
      }
      
      try {
        // 実際にURLにアクセスしてOGP情報を取得
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; YuraYuraStudio/1.0; +https://harmonic-society.co.jp/bot)'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        
        const html = await response.text();
        
        // OGP画像URLを抽出
        const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
        const ogImage = ogImageMatch ? ogImageMatch[1] : null;
        
        // タイトルを抽出
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : null;
        
        // 説明を抽出
        const descriptionMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:description|description)["']\s+content=["']([^"']+)["']/i);
        const description = descriptionMatch ? descriptionMatch[1] : null;
        
        // 画像がなければページ内の大きな画像を探す
        let imageUrl = ogImage;
        if (!imageUrl) {
          const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
          let match;
          const imgMatches = [];
          
          // 正規表現を手動で実行して結果を配列に格納
          while ((match = imgPattern.exec(html)) !== null) {
            imgMatches.push(match);
          }
          
          // サイズが明示されている大きな画像を優先
          for (const match of imgMatches) {
            const imgTag = match[0];
            const src = match[1];
            const widthMatch = imgTag.match(/width=["'](\d+)["']/i);
            const heightMatch = imgTag.match(/height=["'](\d+)["']/i);
            
            if (widthMatch && heightMatch) {
              const width = parseInt(widthMatch[1]);
              const height = parseInt(heightMatch[1]);
              if (width >= 200 && height >= 200) {
                imageUrl = src;
                break;
              }
            }
          }
          
          // サイズが見つからなければ最初の画像を使用
          if (!imageUrl && imgMatches.length > 0) {
            imageUrl = imgMatches[0][1];
          }
        }
        
        // 相対URLを絶対URLに変換
        if (imageUrl && !imageUrl.startsWith('http')) {
          const urlObj = new URL(url);
          if (imageUrl.startsWith('/')) {
            imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
          } else {
            // パスの最後の部分を削除して相対パスの基準を作成
            const basePath = urlObj.pathname.split('/').slice(0, -1).join('/') + '/';
            imageUrl = `${urlObj.protocol}//${urlObj.host}${basePath}${imageUrl}`;
          }
        }
        
        // OGP情報を返す
        return res.json({ 
          title: title || '',
          description: description || '',
          imageUrl: imageUrl || null
        });
      } catch (error) {
        console.error('Error fetching URL:', error);
        
        // エラーの場合はドメインに基づいて画像を返す（フォールバック）
        if (url.includes("github.com")) {
          return res.json({
            imageUrl: "https://github.githubassets.com/assets/github-mark-4c31de01ad6d.svg"
          });
        } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
          return res.json({
            imageUrl: "https://www.youtube.com/img/desktop/yt_1200.png"
          });
        } else if (url.includes("twitter.com") || url.includes("x.com")) {
          return res.json({
            imageUrl: "https://abs.twimg.com/responsive-web/web/icon-default.604e2486a34a2f6e.png"
          });
        } else {
          // その他のURLの場合はデフォルト画像を返す
          return res.json({
            imageUrl: "/ogp.png"
          });
        }
      }
    } catch (error) {
      console.error("OGP fetch error:", error);
      res.status(500).json({ message: "OGP情報の取得に失敗しました" });
    }
  });
  
  // Facebook OGPエンドポイント（認証不要）- Facebookボットがアクセスする専用エンドポイント
  app.get("/facebook", (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="Yura Yura STUDIO - プロジェクト管理ツール">
        <meta property="og:description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？地域愛にあふれるクリエイターの方、ぜひ登録を。">
        <meta property="og:type" content="website">
        <meta property="og:image" content="${req.protocol}://${req.get('host')}/ogp.png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:locale" content="ja_JP">
        <meta property="og:site_name" content="Yura Yura STUDIO">
        <meta property="og:image:alt" content="Yura Yura STUDIO プロジェクト管理ツールの紹介画像">
        <title>Yura Yura STUDIO - プロジェクト管理ツール</title>
      </head>
      <body>
        <script>
          window.location.href = "/";
        </script>
      </body>
      </html>
    `);
  });

  // 通知設定関連のエンドポイント
  // 通知設定の取得
  app.get("/api/notification-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const settings = await storage.getUserNotificationSettings(req.user.id);
      if (!settings) {
        // デフォルトですべての通知が有効
        const defaultSettings = {
          userId: req.user.id,
          // アプリ内通知はデフォルトですべて有効
          notifyProjectCreated: true,
          notifyProjectUpdated: true,
          notifyProjectCommented: true,
          notifyProjectCompleted: true,
          notifyRewardDistributed: true,
          notifyRegistrationApproved: true,
          notifyProjectAssigned: true,
          notifyRegistrationRequest: true,
          notifyCommentMention: true,
          
          // メール通知もデフォルトですべて有効
          emailNotifyProjectCreated: true,
          emailNotifyProjectUpdated: true,
          emailNotifyProjectCommented: true,
          emailNotifyProjectCompleted: true,
          emailNotifyRewardDistributed: true,
          emailNotifyRegistrationApproved: true,
          emailNotifyProjectAssigned: true,
          emailNotifyRegistrationRequest: true,
          emailNotifyCommentMention: true
        };
        const newSettings = await storage.createOrUpdateNotificationSettings(defaultSettings);
        return res.json(newSettings);
      }
      res.json(settings);
    } catch (error) {
      console.error("通知設定取得エラー:", error);
      res.status(500).json({ message: "通知設定の取得に失敗しました" });
    }
  });
  
  // 通知設定の更新
  app.post("/api/notification-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      // リクエストボディの内容をログとして出力
      console.log("通知設定更新リクエスト:", req.body);
      
      // 既存の設定を取得
      const existingSettings = await storage.getUserNotificationSettings(req.user.id) || {
        // デフォルト値を設定
        userId: req.user.id,
        // アプリ内通知
        notifyProjectCreated: true,
        notifyProjectUpdated: true,
        notifyProjectCommented: true, 
        notifyProjectCompleted: true,
        notifyRewardDistributed: true,
        notifyRegistrationApproved: true,
        notifyProjectAssigned: true,
        notifyRegistrationRequest: true,
        notifyCommentMention: true,
        
        // メール通知
        emailNotifyProjectCreated: true,
        emailNotifyProjectUpdated: true,
        emailNotifyProjectCommented: true, 
        emailNotifyProjectCompleted: true,
        emailNotifyRewardDistributed: true,
        emailNotifyRegistrationApproved: true,
        emailNotifyProjectAssigned: true,
        emailNotifyRegistrationRequest: true,
        emailNotifyCommentMention: true
      };
      
      // リクエストボディから設定を更新
      const settings = {
        userId: req.user.id,
        
        // アプリ内通知設定
        notifyProjectCreated: req.body.notifyProjectCreated !== undefined ? !!req.body.notifyProjectCreated : existingSettings.notifyProjectCreated,
        notifyProjectUpdated: req.body.notifyProjectUpdated !== undefined ? !!req.body.notifyProjectUpdated : existingSettings.notifyProjectUpdated,
        notifyProjectCommented: req.body.notifyProjectCommented !== undefined ? !!req.body.notifyProjectCommented : existingSettings.notifyProjectCommented,
        notifyProjectCompleted: req.body.notifyProjectCompleted !== undefined ? !!req.body.notifyProjectCompleted : existingSettings.notifyProjectCompleted,
        notifyRewardDistributed: req.body.notifyRewardDistributed !== undefined ? !!req.body.notifyRewardDistributed : existingSettings.notifyRewardDistributed,
        notifyRegistrationApproved: req.body.notifyRegistrationApproved !== undefined ? !!req.body.notifyRegistrationApproved : existingSettings.notifyRegistrationApproved,
        notifyProjectAssigned: req.body.notifyProjectAssigned !== undefined ? !!req.body.notifyProjectAssigned : existingSettings.notifyProjectAssigned,
        notifyRegistrationRequest: req.body.notifyRegistrationRequest !== undefined ? !!req.body.notifyRegistrationRequest : existingSettings.notifyRegistrationRequest,
        notifyCommentMention: req.body.notifyCommentMention !== undefined ? !!req.body.notifyCommentMention : existingSettings.notifyCommentMention,
        
        // メール通知設定
        emailNotifyProjectCreated: req.body.emailNotifyProjectCreated !== undefined ? !!req.body.emailNotifyProjectCreated : existingSettings.emailNotifyProjectCreated,
        emailNotifyProjectUpdated: req.body.emailNotifyProjectUpdated !== undefined ? !!req.body.emailNotifyProjectUpdated : existingSettings.emailNotifyProjectUpdated,
        emailNotifyProjectCommented: req.body.emailNotifyProjectCommented !== undefined ? !!req.body.emailNotifyProjectCommented : existingSettings.emailNotifyProjectCommented,
        emailNotifyProjectCompleted: req.body.emailNotifyProjectCompleted !== undefined ? !!req.body.emailNotifyProjectCompleted : existingSettings.emailNotifyProjectCompleted,
        emailNotifyRewardDistributed: req.body.emailNotifyRewardDistributed !== undefined ? !!req.body.emailNotifyRewardDistributed : existingSettings.emailNotifyRewardDistributed,
        emailNotifyRegistrationApproved: req.body.emailNotifyRegistrationApproved !== undefined ? !!req.body.emailNotifyRegistrationApproved : existingSettings.emailNotifyRegistrationApproved,
        emailNotifyProjectAssigned: req.body.emailNotifyProjectAssigned !== undefined ? !!req.body.emailNotifyProjectAssigned : existingSettings.emailNotifyProjectAssigned,
        emailNotifyRegistrationRequest: req.body.emailNotifyRegistrationRequest !== undefined ? !!req.body.emailNotifyRegistrationRequest : existingSettings.emailNotifyRegistrationRequest,
        emailNotifyCommentMention: req.body.emailNotifyCommentMention !== undefined ? !!req.body.emailNotifyCommentMention : existingSettings.emailNotifyCommentMention
      };
      
      console.log("更新する設定:", settings);
      
      const updatedSettings = await storage.createOrUpdateNotificationSettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("通知設定更新エラー:", error);
      res.status(500).json({ message: "通知設定の更新に失敗しました" });
    }
  });
  
  // 通知履歴の取得
  app.get("/api/notification-history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const history = await storage.getNotificationHistory(req.user.id);
      res.json(history);
    } catch (error) {
      console.error("通知履歴取得エラー:", error);
      res.status(500).json({ message: "通知履歴の取得に失敗しました" });
    }
  });
  
  // S3設定チェックエンドポイント（管理者のみ）
  app.get("/api/test-s3", async (req, res) => {
    // 認証チェック
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    // 管理者権限チェック
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "管理者権限が必要です" });
    }
    try {
      console.log('S3設定テストを実行します...');
      
      // 環境変数のチェック
      const envCheck = {
        AWS_REGION: !!process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
      };

      // ストレージサービスの確認
      const storageType = process.env.AWS_ACCESS_KEY_ID ? 'S3' : 'Replit Object Storage';

      // 簡単な動作テスト
      let testResult = {
        success: false,
        message: '',
      };

      try {
        // テストファイルのアップロード
        const testContent = Buffer.from('S3 test file');
        const result = await storageService.uploadFile(
          testContent,
          'test-s3-config.txt',
          'text/plain'
        );
        
        // ファイルの削除
        await storageService.deleteFile(result.filename);
        
        testResult = {
          success: true,
          message: 'S3への接続とファイル操作が正常に動作しています',
        };
      } catch (error: any) {
        testResult = {
          success: false,
          message: `エラー: ${error.message}`,
        };
      }

      res.json({
        storageType,
        environmentVariables: envCheck,
        testResult,
        configuration: {
          region: process.env.AWS_REGION || 'not set',
          bucket: process.env.AWS_S3_BUCKET || 'not set',
        },
      });
    } catch (error: any) {
      console.error('S3テストエラー:', error);
      res.status(500).json({ 
        error: 'S3設定テストに失敗しました',
        message: error.message,
      });
    }
  });

  // プロジェクトファイルのアップロード
  app.post("/api/projects/:id/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    const projectId = Number(req.params.id);
    
    // プロジェクトへのアクセス権限確認
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "プロジェクトが見つかりません" });
    }
    
    const userId = req.user.id;
    const hasAccess = req.user.role === "ADMIN" || 
                      project.directorId === userId || 
                      project.salesId === userId || 
                      project.assignedUsers?.includes(userId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "このプロジェクトへのアクセス権限がありません" });
    }

    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "ファイルがアップロードされていません" });
    }

    const uploadedFile = req.files.file as any;
    
    // ファイルサイズチェック (100MB)
    const maxFileSize = 100 * 1024 * 1024;
    if (uploadedFile.size > maxFileSize) {
      return res.status(400).json({ message: "ファイルサイズが100MBを超えています" });
    }

    try {
      // S3にアップロード
      const sanitizedName = uploadedFile.name
        .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        .replace(/\s+/g, '_');
      const fileName = `project-${projectId}/files/${Date.now()}-${sanitizedName}`;
      
      const uploadResult = await storageService.uploadFile(
        uploadedFile.data,
        fileName,
        uploadedFile.mimetype
      );

      // データベースに保存
      const fileRecord = await db.insert(projectFiles).values({
        projectId: projectId,
        uploadedBy: req.user.id,
        fileName: uploadedFile.name,
        filePath: uploadResult.filename,
        fileType: uploadedFile.mimetype,
        fileSize: uploadedFile.size,
        description: req.body.description || null
      }).returning();

      res.status(201).json(fileRecord[0]);
    } catch (error) {
      console.error("ファイルアップロードエラー:", error);
      res.status(500).json({ message: "ファイルのアップロードに失敗しました" });
    }
  });

  // プロジェクトファイル一覧の取得
  app.get("/api/projects/:id/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    const projectId = Number(req.params.id);
    
    // プロジェクトへのアクセス権限確認
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "プロジェクトが見つかりません" });
    }
    
    const userId = req.user.id;
    const hasAccess = req.user.role === "ADMIN" || 
                      project.directorId === userId || 
                      project.salesId === userId || 
                      project.assignedUsers?.includes(userId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "このプロジェクトへのアクセス権限がありません" });
    }

    try {
      const files = await db.select({
        id: projectFiles.id,
        projectId: projectFiles.projectId,
        uploadedBy: projectFiles.uploadedBy,
        uploadedByUser: users.name,
        fileName: projectFiles.fileName,
        filePath: projectFiles.filePath,
        fileType: projectFiles.fileType,
        fileSize: projectFiles.fileSize,
        description: projectFiles.description,
        createdAt: projectFiles.createdAt
      })
      .from(projectFiles)
      .leftJoin(users, eq(projectFiles.uploadedBy, users.id))
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));

      res.json(files);
    } catch (error) {
      console.error("ファイル一覧取得エラー:", error);
      res.status(500).json({ message: "ファイル一覧の取得に失敗しました" });
    }
  });

  // プロジェクトファイルのダウンロード
  app.get("/api/projects/:projectId/files/:fileId/download", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    const projectId = Number(req.params.projectId);
    const fileId = Number(req.params.fileId);
    
    // プロジェクトへのアクセス権限確認
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "プロジェクトが見つかりません" });
    }
    
    const userId = req.user.id;
    const hasAccess = req.user.role === "ADMIN" || 
                      project.directorId === userId || 
                      project.salesId === userId || 
                      project.assignedUsers?.includes(userId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "このプロジェクトへのアクセス権限がありません" });
    }

    try {
      const [file] = await db.select()
        .from(projectFiles)
        .where(eq(projectFiles.id, fileId));

      if (!file || file.projectId !== projectId) {
        return res.status(404).json({ message: "ファイルが見つかりません" });
      }

      // S3からファイルを取得
      const fileBuffer = await storageService.downloadFile(file.filePath);
      
      res.setHeader('Content-Type', file.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("ファイルダウンロードエラー:", error);
      res.status(500).json({ message: "ファイルのダウンロードに失敗しました" });
    }
  });

  // プロジェクトファイルの削除
  app.delete("/api/projects/:projectId/files/:fileId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    const projectId = Number(req.params.projectId);
    const fileId = Number(req.params.fileId);

    try {
      const [file] = await db.select()
        .from(projectFiles)
        .where(eq(projectFiles.id, fileId));

      if (!file || file.projectId !== projectId) {
        return res.status(404).json({ message: "ファイルが見つかりません" });
      }

      // アップロードしたユーザーまたは管理者のみ削除可能
      if (file.uploadedBy !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "このファイルを削除する権限がありません" });
      }

      // S3からファイルを削除
      await storageService.deleteFile(file.filePath);
      
      // データベースから削除
      await db.delete(projectFiles).where(eq(projectFiles.id, fileId));

      res.status(204).send();
    } catch (error) {
      console.error("ファイル削除エラー:", error);
      res.status(500).json({ message: "ファイルの削除に失敗しました" });
    }
  });

  // テスト用の通知送信エンドポイント
  app.post("/api/test-notification", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      console.log("🧪 テスト通知リクエスト受信:", req.body);
      const eventType = req.body.event || "PROJECT_CREATED";
      const title = req.body.title || "テスト通知";
      const message = req.body.message || "これはテスト通知です。";
      const link = req.body.link || null;
      const testEmail = req.body.testEmail; // テスト用の送信先メールアドレス（オプション）
      
      if (!req.user) {
        return res.status(401).json({ message: "認証が必要です" });
      }
      
      // ユーザー情報を取得
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }
      
      // 送信先メールアドレスを決定（ストレージ以外の送信でも使用）
      const targetEmail = testEmail || user.email;
      
      console.log(`🧪 テスト通知を送信します: ユーザー ${user.name} (${user.email}), 送信先: ${targetEmail}, イベント: ${eventType}`);
      
      // イベントが正しい形式かどうか確認
      if (!notificationEvents.includes(eventType as NotificationEvent)) {
        console.error("不正なイベント型:", eventType);
        return res.status(400).json({ message: "不正なイベント型です" });
      }
      
      // SMTP設定が有効かどうか確認するためのデバッグ情報
      console.log("🔍 メール送信前確認:", {
        "SMTP_HOST": process.env.SMTP_HOST ? "設定済み" : "未設定",
        "SMTP_PORT": process.env.SMTP_PORT ? "設定済み" : "未設定",
        "SMTP_USER": process.env.SMTP_USER ? "設定済み" : "未設定",
        "SMTP_PASS": process.env.SMTP_PASS ? "設定済み" : "未設定",
        "SMTP_FROM": process.env.SMTP_FROM || "未設定",
        "SMTP_SECURE": process.env.SMTP_SECURE || "未設定",
        "送信先メール": user.email
      });
      
      try {
        // 通知履歴を記録
        await storage.createNotificationHistory({
          userId: req.user.id,
          event: eventType as NotificationEvent,
          title,
          message,
          link
        });
        console.log("✅ 通知履歴を記録しました");
      } catch (historyError) {
        console.error("通知履歴記録エラー:", historyError);
        // 履歴エラーは無視して続行
      }
      
      try {
        // カスタムメールアドレスが指定されている場合、直接メール送信メソッドを呼び出す
        if (testEmail) {
          await sendNotificationEmail(testEmail, eventType as NotificationEvent, {
            title,
            message,
            link
          });
          console.log(`✅ カスタムアドレス ${testEmail} へテスト通知メールを送信しました`);
        } else {
          // 通常のフロー（ユーザーIDを使用してストレージから送信）
          await storage.sendNotificationEmail(req.user.id, eventType as NotificationEvent, {
            title,
            message,
            link
          });
          console.log("✅ テスト通知メールを送信しました");
        }
        
        // 成功したら通常通り応答
        return res.json({ 
          success: true, 
          message: "テスト通知を送信しました", 
          timestamp: new Date().toISOString(),
          email: testEmail || user.email
        });
      } catch (emailError) {
        console.error("📧 メール送信エラー詳細:", emailError);
        
        // エラーの詳細情報を抽出
        let errorDetails: Record<string, any> = {
          message: emailError instanceof Error ? emailError.message : String(emailError),
          code: (emailError as any)?.code || "不明なエラーコード",
          response: (emailError as any)?.response || null,
          responseCode: (emailError as any)?.responseCode || null,
        };
        
        // RejectedError がある場合はそれも表示
        if ((emailError as any)?.rejected) {
          errorDetails.rejected = (emailError as any).rejected;
          errorDetails.rejectedErrors = (emailError as any).rejectedErrors?.map((e: any) => e.message) || [];
        }
        
        // 構造化されたエラー情報をレスポンスに含める
        return res.status(500).json({ 
          success: false, 
          message: "テスト通知メールの送信に失敗しました", 
          error: errorDetails,
          timestamp: new Date().toISOString(),
          ipAddress: req.ip, // クライアントのIP（参考情報）
          debug: {
            smtpHost: process.env.SMTP_HOST ? process.env.SMTP_HOST : null,
            smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
            smtpSecure: process.env.SMTP_SECURE === 'true',
            smtpHasAuth: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
            targetEmail: user.email
          }
        });
      }
    } catch (error) {
      console.error("テスト通知エラー:", error);
      // エラー時も詳細な情報を返す
      res.status(500).json({ 
        success: false, 
        message: "テスト通知の送信に失敗しました", 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'production' ? undefined : (error instanceof Error ? error.stack : undefined)
      });
    }
  });

  // 通知関連のAPI

  // ユーザーの通知履歴を取得
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("通知履歴の取得に失敗しました:", error);
      res.status(500).json({ message: "通知履歴の取得に失敗しました" });
    }
  });

  // 未読の通知数を取得
  app.get("/api/notifications/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("未読通知数の取得に失敗しました:", error);
      res.status(500).json({ message: "未読通知数の取得に失敗しました" });
    }
  });

  // 通知を既読にする
  app.post("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const notificationId = Number(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "通知が見つかりません" });
      }
      
      // 自分の通知のみ既読にできる
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "この操作は許可されていません" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("通知の既読処理に失敗しました:", error);
      res.status(500).json({ message: "通知の既読処理に失敗しました" });
    }
  });

  // すべての通知を既読にする
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("すべての通知の既読処理に失敗しました:", error);
      res.status(500).json({ message: "すべての通知の既読処理に失敗しました" });
    }
  });

  // ダイレクトメッセージ関連のAPIエンドポイント
  
  // ダイレクトメッセージの取得
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const messages = await storage.getDirectMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error("ダイレクトメッセージの取得に失敗しました:", error);
      res.status(500).json({ message: "ダイレクトメッセージの取得に失敗しました" });
    }
  });
  
  // ユーザー間の会話の取得
  app.get("/api/messages/conversation/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const conversation = await storage.getConversation(
        req.user.id,
        Number(req.params.userId)
      );
      res.json(conversation);
    } catch (error) {
      console.error("会話の取得に失敗しました:", error);
      res.status(500).json({ message: "会話の取得に失敗しました" });
    }
  });
  
  // ダイレクトメッセージの送信
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const fromUserId = req.user.id;
      const messageData = insertDirectMessageSchema.parse({
        ...req.body,
        fromUserId
      });
      
      const message = await storage.createDirectMessage(messageData);
      
      // 受信者のユーザー情報を取得
      const toUser = await storage.getUser(messageData.toUserId);
      
      if (toUser) {
        // 送信者情報を取得
        const fromUser = await storage.getUser(fromUserId);
        const senderName = fromUser?.name || "ユーザー";
        
        // 受信者の通知設定を確認
        const notificationSettings = await storage.getUserNotificationSettings(messageData.toUserId);
        
        // アプリ内通知の送信
        if (notificationSettings?.notifyDirectMessage !== false) {
          try {
            // 通知履歴を追加
            await storage.createNotificationHistory({
              userId: messageData.toUserId,
              event: "DIRECT_MESSAGE",
              title: `${senderName}さんからメッセージが届きました`,
              message: messageData.message.length > 100 
                ? `${messageData.message.substring(0, 100)}...` 
                : messageData.message,
              link: `/messages?userId=${fromUserId}`
            });
          } catch (notificationError) {
            console.error("通知の作成に失敗しました:", notificationError);
          }
        }
        
        // メール通知の送信
        if (notificationSettings?.emailNotifyDirectMessage !== false && toUser.email) {
          try {
            await sendNotificationEmail(
              toUser.email,
              "DIRECT_MESSAGE",
              {
                title: `${senderName}さんからメッセージが届きました`,
                message: `${senderName}さんから新しいメッセージが届きました。\n\n「${
                  messageData.message.length > 100 
                  ? `${messageData.message.substring(0, 100)}...` 
                  : messageData.message
                }」`,
                link: `${getBaseUrl(req)}/messages?userId=${fromUserId}`
              }
            );
          } catch (emailError) {
            console.error("メール通知の送信に失敗しました:", emailError);
          }
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なメッセージデータです", errors: error.errors });
      } else {
        console.error("メッセージの送信に失敗しました:", error);
        res.status(500).json({ message: "メッセージの送信に失敗しました" });
      }
    }
  });
  
  // メッセージを既読にする
  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      await storage.markDirectMessageAsRead(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("メッセージの既読処理に失敗しました:", error);
      res.status(500).json({ message: "メッセージの既読処理に失敗しました" });
    }
  });
  
  // 未読メッセージ数の取得
  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    
    try {
      const count = await storage.getUnreadDirectMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("未読メッセージ数の取得に失敗しました:", error);
      res.status(500).json({ message: "未読メッセージ数の取得に失敗しました" });
    }
  });

  // Object Storageからファイルを提供するエンドポイント
  app.get("/api/files/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      console.log("ファイル取得リクエスト:", filename);

      // まずファイルの存在を確認
      const fileExists = await storageService.fileExists(filename);
      if (!fileExists) {
        console.log("ファイルが存在しません:", filename);
        return res.status(404).json({ message: "ファイルが見つかりません" });
      }

      // Object Storageからファイルをダウンロード
      const fileBuffer = await storageService.downloadFile(filename);
      
      // ファイルの存在確認
      if (!fileBuffer || fileBuffer.length === 0) {
        console.log("ファイルバッファが空です:", filename);
        return res.status(404).json({ message: "ファイルが見つかりません" });
      }

      // ファイル拡張子からContent-Typeを設定
      const ext = filename.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'doc':
          contentType = 'application/msword';
          break;
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'xls':
          contentType = 'application/vnd.ms-excel';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'ppt':
          contentType = 'application/vnd.ms-powerpoint';
          break;
        case 'pptx':
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;
        case 'txt':
          contentType = 'text/plain';
          break;
        case 'zip':
          contentType = 'application/zip';
          break;
      }

      console.log(`ファイル配信成功: ${filename}, サイズ: ${fileBuffer.length} bytes`);

      res.set({
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'Cache-Control': 'public, max-age=31536000', // 1年間キャッシュ
      });

      res.send(fileBuffer);
    } catch (error) {
      console.error("ファイル取得エラー:", error);
      
      // エラーの詳細をログに記録
      if (error instanceof Error) {
        console.error("エラーメッセージ:", error.message);
        console.error("スタックトレース:", error.stack);
      }
      
      res.status(500).json({ 
        message: "ファイルの取得に失敗しました",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  return httpServer;
}
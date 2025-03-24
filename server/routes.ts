import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
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
  type NotificationEvent
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { isAdmin, canUpdateProjectStatus, canChangePassword, canAccessProject } from "./middleware/permissions";
import { comparePasswords, hashPassword } from "./auth";
import { db } from './db';
import { sendNotificationEmail } from "./mail";
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function registerRoutes(app: Express) {
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
    if (req.user.role !== "ADMIN") {
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
                  link: `${process.env.APP_URL || 'https://yurayurastudio.com'}/projects/${project.id}`
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
      const commentData = insertCommentSchema.parse({
        ...req.body,
        projectId: Number(req.params.id),
        userId: req.user.id // ログインユーザーのIDを使用
      });
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なコメントデータです", errors: error.errors });
      } else {
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
    const portfolios = await storage.getAllPortfolios();
    res.json(portfolios);
  });

  // Get project portfolios (読み取り可能)
  app.get("/api/projects/:id/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const portfolios = await storage.getPortfolios(Number(req.params.id));
    res.json(portfolios);
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

  // Create a portfolio (管理者のみ)
  app.post("/api/projects/:id/portfolios", isAdmin, async (req, res) => {
    try {
      const portfolioData = insertPortfolioSchema.parse({
        ...req.body,
        projectId: Number(req.params.id),
      });

      const portfolio = await storage.createPortfolio(portfolioData);
      res.status(201).json(portfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なポートフォリオデータです", errors: error.errors });
      } else {
        res.status(500).json({ message: "ポートフォリオの作成に失敗しました" });
      }
    }
  });

  // Update a portfolio (管理者のみ)
  app.patch("/api/portfolios/:id", isAdmin, async (req, res) => {
    try {
      const portfolioData = insertPortfolioSchema.partial().parse(req.body);
      const portfolio = await storage.updatePortfolio(Number(req.params.id), portfolioData);
      res.json(portfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "無効なポートフォリオデータです", errors: error.errors });
      } else {
        res.status(500).json({ message: "ポートフォリオの更新に失敗しました" });
      }
    }
  });

  // Delete a portfolio (管理者のみ)
  app.delete("/api/portfolios/:id", isAdmin, async (req, res) => {
    await storage.deletePortfolio(Number(req.params.id));
    res.status(204).send();
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
              link: `${process.env.APP_URL || 'https://yurayurastudio.com'}`
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
      const uploadPath = path.join(uploadsDir, fileName);

      await avatarFile.mv(uploadPath);
      const avatarUrl = `/uploads/${fileName}`;

      await storage.updateUser(req.user.id, { avatarUrl });
      res.json({ url: avatarUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ message: "画像のアップロードに失敗しました" });
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
      const user = await storage.getUser(req.user.id);
      const postWithUser = {
        ...post,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl
        }
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
      
      // URLのドメインに基づいて画像を返す（簡易実装）
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
          notifyProjectCreated: true,
          notifyProjectUpdated: true,
          notifyProjectCommented: true,
          notifyProjectCompleted: true,
          notifyRewardDistributed: true
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
      const settings = {
        userId: req.user.id,
        notifyProjectCreated: !!req.body.notifyProjectCreated,
        notifyProjectUpdated: !!req.body.notifyProjectUpdated,
        notifyProjectCommented: !!req.body.notifyProjectCommented, 
        notifyProjectCompleted: !!req.body.notifyProjectCompleted,
        notifyRewardDistributed: !!req.body.notifyRewardDistributed
      };
      
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
        let errorDetails = {
          message: emailError instanceof Error ? emailError.message : String(emailError),
          code: (emailError as any)?.code || "不明なエラーコード",
          response: (emailError as any)?.response || null,
          responseCode: (emailError as any)?.responseCode || null,
        };
        
        // RejectedError がある場合はそれも表示
        if ((emailError as any)?.rejected) {
          errorDetails = {
            ...errorDetails,
            rejected: (emailError as any).rejected,
            rejectedErrors: (emailError as any).rejectedErrors?.map((e: any) => e.message) || []
          };
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

  return httpServer;
}
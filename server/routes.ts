import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertCommentSchema, insertUserSchema, updateUserSchema, insertPortfolioSchema, changePasswordSchema, registrationRequestSchema, registrationRequests, users, type RegistrationRequest, type InsertRegistrationRequest, insertTimelinePostSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { isAdmin, canUpdateProjectStatus, canChangePassword } from "./middleware/permissions";
import { comparePasswords, hashPassword } from "./auth";
import { db } from './db';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { updateProfileSchema } from "@shared/schema";

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

  // Get all projects (読み取り可能)
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const projects = await storage.getProjects();
    res.json(projects);
  });

  // Get a single project (読み取り可能)
  app.get("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const project = await storage.getProject(Number(req.params.id));
    if (!project) {
      res.status(404).json({ message: "プロジェクトが見つかりません" });
      return;
    }
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
      const projectData = {
        ...insertProjectSchema.partial().parse(req.body),
        ...(typeof req.body.rewardDistributed === 'boolean' ? { rewardDistributed: req.body.rewardDistributed } : {})
      };

      const project = await storage.updateProject(Number(req.params.id), projectData);
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

  // Get OGP image for a URL (読み取り可能)
  app.get("/api/ogp", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const response = await fetch(url);
      const html = await response.text();

      // Extract OGP image URL from meta tags
      const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/);
      const ogImage = ogImageMatch ? ogImageMatch[1] : null;

      // If no OGP image, try twitter:image
      const twitterImageMatch = !ogImage && html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/);
      const twitterImage = twitterImageMatch ? twitterImageMatch[1] : null;

      // If no social media images, try first img tag
      const imgMatch = !ogImage && !twitterImage && html.match(/<img[^>]*src="([^"]*)"[^>]*>/);
      const firstImage = imgMatch ? imgMatch[1] : null;

      const imageUrl = ogImage || twitterImage || firstImage;

      if (!imageUrl) {
        return res.status(404).json({ message: "No image found" });
      }

      // Convert relative URLs to absolute
      const finalImageUrl = new URL(imageUrl, url).href;
      res.json({ imageUrl: finalImageUrl });
    } catch (error) {
      console.error('OGP fetch error:', error);
      res.status(500).json({ message: "Failed to fetch OGP data" });
    }
  });

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
        await storage.createUser({
          name: request.name,
          role: request.role,
          email: request.email,
          username: request.username,
          password: request.password,
          approved: true
        });

        await storage.updateRegistrationRequestStatus(Number(id), "APPROVED");
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

  return httpServer;
}
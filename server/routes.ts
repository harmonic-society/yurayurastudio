import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertCommentSchema, insertUserSchema, updateUserSchema, insertPortfolioSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { isAdmin } from "./middleware/admin";

export async function registerRoutes(app: Express) {
  // Set up authentication routes and middleware
  setupAuth(app);

  const httpServer = createServer(app);

  // Get all projects
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const projects = await storage.getProjects();
    res.json(projects);
  });

  // Get a single project
  app.get("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const project = await storage.getProject(Number(req.params.id));
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json(project);
  });

  // Create a project
  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  // Update a project
  app.patch("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
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
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update project" });
      }
    }
  });

  // Delete a project
  app.delete("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    await storage.deleteProject(Number(req.params.id));
    res.status(204).send();
  });

  // Get project comments
  app.get("/api/projects/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const comments = await storage.getProjectComments(Number(req.params.id));
    res.json(comments);
  });

  // Add a comment
  app.post("/api/projects/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        projectId: Number(req.params.id)
      });
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create comment" });
      }
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const users = await storage.getUsers();
    res.json(users);
  });

  // Get a single user
  app.get("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  });

  // Update a user
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const userData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), userData);
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Delete a user
  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });

  // Get all portfolios
  app.get("/api/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const portfolios = await storage.getAllPortfolios();
    res.json(portfolios);
  });

  // Get project portfolios
  app.get("/api/projects/:id/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const portfolios = await storage.getPortfolios(Number(req.params.id));
    res.json(portfolios);
  });

  // Get a single portfolio
  app.get("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) {
      res.status(404).json({ message: "Portfolio not found" });
      return;
    }
    res.json(portfolio);
  });

  // Create a portfolio
  app.post("/api/projects/:id/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const portfolioData = insertPortfolioSchema.parse({
        ...req.body,
        projectId: Number(req.params.id),
      });

      const portfolio = await storage.createPortfolio(portfolioData);
      res.status(201).json(portfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid portfolio data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create portfolio" });
      }
    }
  });

  // Update a portfolio
  app.patch("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    try {
      const portfolioData = insertPortfolioSchema.partial().parse(req.body);
      const portfolio = await storage.updatePortfolio(Number(req.params.id), portfolioData);
      res.json(portfolio);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid portfolio data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update portfolio" });
      }
    }
  });

  // Delete a portfolio
  app.delete("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }
    await storage.deletePortfolio(Number(req.params.id));
    res.status(204).send();
  });

  // Get OGP image for a URL
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

  // 管理者用APIエンドポイントを追加
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

  return httpServer;
}
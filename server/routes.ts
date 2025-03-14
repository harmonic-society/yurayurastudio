import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertCommentSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Get all projects
  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  // Get a single project
  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json(project);
  });

  // Create a project
  app.post("/api/projects", async (req, res) => {
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
    try {
      // Allow partial updates including rewardDistributed
      const projectData = {
        ...insertProjectSchema.partial().parse(req.body),
        // If rewardDistributed is explicitly set, include it
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
    await storage.deleteProject(Number(req.params.id));
    res.status(204).send();
  });

  // Get project comments
  app.get("/api/projects/:id/comments", async (req, res) => {
    const comments = await storage.getProjectComments(Number(req.params.id));
    res.json(comments);
  });

  // Add a comment
  app.post("/api/projects/:id/comments", async (req, res) => {
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
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  // Get a single user
  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  });

  // Create a user
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  // Update a user
  app.patch("/api/users/:id", async (req, res) => {
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
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
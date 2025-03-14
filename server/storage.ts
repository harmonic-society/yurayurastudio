import { 
  projects,
  comments,
  users,
  projectAssignments,
  portfolios,
  type Project, 
  type InsertProject,
  type Comment,
  type InsertComment,
  type User,
  type InsertUser,
  type Portfolio,
  type InsertPortfolio
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject> & { rewardDistributed?: boolean }): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Comments
  getProjectComments(projectId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUser(id: number, user: Partial<Omit<User, "id">>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Portfolios
  getAllPortfolios(): Promise<Portfolio[]>; // 新規追加
  getPortfolios(projectId: number): Promise<Portfolio[]>;
  getPortfolio(id: number): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: number, portfolio: Partial<InsertPortfolio>): Promise<Portfolio>;
  deletePortfolio(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    const allProjects = await db.select().from(projects);
    const allAssignments = await db.select().from(projectAssignments);

    return allProjects.map(project => ({
      ...project,
      assignedUsers: allAssignments
        .filter(a => a.projectId === project.id)
        .map(a => a.userId)
    }));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));

    if (project) {
      // Get assigned users
      const assignments = await db
        .select()
        .from(projectAssignments)
        .where(eq(projectAssignments.projectId, id));

      return {
        ...project,
        assignedUsers: assignments.map(a => a.userId)
      };
    }

    return undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const { assignedUsers, ...projectData } = insertProject;
    const [project] = await db.insert(projects).values(projectData).returning();

    // Insert project assignments
    if (assignedUsers?.length) {
      await db.insert(projectAssignments).values(
        assignedUsers.map(userId => ({
          projectId: project.id,
          userId
        }))
      );
    }

    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject> & { rewardDistributed?: boolean }): Promise<Project> {
    const { assignedUsers, ...projectData } = project;

    // Update project data including rewardDistributed if provided
    const [updated] = await db
      .update(projects)
      .set(projectData)
      .where(eq(projects.id, id))
      .returning();

    // Update project assignments if provided
    if (assignedUsers) {
      // Delete existing assignments
      await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));

      // Insert new assignments
      if (assignedUsers.length) {
        await db.insert(projectAssignments).values(
          assignedUsers.map(userId => ({
            projectId: id,
            userId
          }))
        );
      }
    }

    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    // Delete project assignments first
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
    // Delete project comments
    await db.delete(comments).where(eq(comments.projectId, id));
    // Delete project
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getProjectComments(projectId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.projectId, projectId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<Omit<User, "id">>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    // Delete user's project assignments
    await db.delete(projectAssignments).where(eq(projectAssignments.userId, id));
    // Delete user's comments
    await db.delete(comments).where(eq(comments.userId, id));
    // Delete user
    await db.delete(users).where(eq(users.id, id));
  }

  // 新規追加: 全ポートフォリオの取得
  async getAllPortfolios(): Promise<Portfolio[]> {
    return await db
      .select()
      .from(portfolios)
      .orderBy(portfolios.createdAt);
  }

  // Portfolios
  async getPortfolios(projectId: number): Promise<Portfolio[]> {
    return await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.projectId, projectId))
      .orderBy(portfolios.createdAt);
  }

  async getPortfolio(id: number): Promise<Portfolio | undefined> {
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.id, id));
    return portfolio;
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [newPortfolio] = await db
      .insert(portfolios)
      .values(portfolio)
      .returning();
    return newPortfolio;
  }

  async updatePortfolio(id: number, portfolio: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [updated] = await db
      .update(portfolios)
      .set(portfolio)
      .where(eq(portfolios.id, id))
      .returning();
    return updated;
  }

  async deletePortfolio(id: number): Promise<void> {
    await db.delete(portfolios).where(eq(portfolios.id, id));
  }
}

export const storage = new DatabaseStorage();
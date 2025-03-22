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
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

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
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUser(id: number, user: Partial<Omit<User, "id">>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Portfolios
  getAllPortfolios(): Promise<Portfolio[]>;
  getPortfolios(projectId: number): Promise<Portfolio[]>;
  getPortfolio(id: number): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: number, portfolio: Partial<InsertPortfolio>): Promise<Portfolio>;
  deletePortfolio(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

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
    const [updated] = await db
      .update(projects)
      .set(projectData)
      .where(eq(projects.id, id))
      .returning();

    if (assignedUsers) {
      await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
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
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
    await db.delete(comments).where(eq(comments.projectId, id));
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
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
    await db.delete(projectAssignments).where(eq(projectAssignments.userId, id));
    await db.delete(comments).where(eq(comments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllPortfolios(): Promise<Portfolio[]> {
    return await db
      .select()
      .from(portfolios)
      .orderBy(portfolios.createdAt);
  }

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
import { 
  projects,
  comments,
  users,
  projectAssignments,
  type Project, 
  type InsertProject,
  type Comment,
  type InsertComment,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
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
}

export const storage = new DatabaseStorage();
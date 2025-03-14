import { 
  type Project, 
  type InsertProject,
  type Comment,
  type InsertComment,
  type User
} from "@shared/schema";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
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

export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private comments: Map<number, Comment>;
  private users: Map<number, User>;
  private currentProjectId = 1;
  private currentCommentId = 1;
  private currentUserId = 4; // Since we have 3 initial users

  constructor() {
    this.projects = new Map();
    this.comments = new Map();
    this.users = new Map([
      [1, { id: 1, name: "John Director", role: "DIRECTOR", email: "john@example.com" }],
      [2, { id: 2, name: "Sarah Sales", role: "SALES", email: "sarah@example.com" }],
      [3, { id: 3, name: "Mike Creator", role: "CREATOR", email: "mike@example.com" }]
    ]);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = {
      ...insertProject,
      id,
      rewardDistributed: false
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error("Project not found");

    const updated = { ...existing, ...project };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
  }

  async getProjectComments(projectId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.projectId === projectId);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: new Date()
    };
    this.comments.set(id, comment);
    return comment;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<Omit<User, "id">>): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) throw new Error("User not found");

    const updated = { ...existing, ...user };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }
}

export const storage = new MemStorage();
import { 
  projects,
  comments,
  users,
  registrationRequests,
  projectAssignments,
  portfolios,
  timelinePosts,
  skillCategories,
  skillTags,
  userSkills,
  rewardDistributions,
  type Project, 
  type InsertProject,
  type Comment,
  type InsertComment,
  type User,
  type InsertUser,
  type Portfolio,
  type InsertPortfolio,
  type RegistrationRequest,
  type InsertRegistrationRequest,
  type TimelinePost,
  type InsertTimelinePost,
  type SkillCategory,
  type InsertSkillCategory,
  type SkillTag,
  type InsertSkillTag,
  type UserSkill,
  type UserSkillUpdate,
  type RewardDistribution,
  type InsertRewardDistribution
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // Registration requests
  getRegistrationRequests(): Promise<RegistrationRequest[]>;
  createRegistrationRequest(request: InsertRegistrationRequest): Promise<RegistrationRequest>;
  updateRegistrationRequestStatus(id: number, status: "APPROVED" | "REJECTED"): Promise<RegistrationRequest>;
  getRegistrationRequest(id: number): Promise<RegistrationRequest | undefined>;

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
  
  // Timeline posts
  getTimelinePosts(): Promise<TimelinePost[]>;
  getTimelinePostsByUser(userId: number): Promise<TimelinePost[]>;
  getTimelinePost(id: number): Promise<TimelinePost | undefined>;
  createTimelinePost(post: InsertTimelinePost): Promise<TimelinePost>;
  deleteTimelinePost(id: number): Promise<void>;
  
  // Skills
  getSkillCategories(): Promise<SkillCategory[]>;
  getSkillCategory(id: number): Promise<SkillCategory | undefined>;
  createSkillCategory(category: InsertSkillCategory): Promise<SkillCategory>;
  updateSkillCategory(id: number, category: Partial<InsertSkillCategory>): Promise<SkillCategory>;
  deleteSkillCategory(id: number): Promise<void>;
  
  // Skill Tags
  getSkillTags(): Promise<SkillTag[]>;
  getSkillTagsByCategory(categoryId: number): Promise<SkillTag[]>;
  getSkillTag(id: number): Promise<SkillTag | undefined>;
  createSkillTag(tag: InsertSkillTag): Promise<SkillTag>;
  updateSkillTag(id: number, tag: Partial<InsertSkillTag>): Promise<SkillTag>;
  deleteSkillTag(id: number): Promise<void>;
  
  // User Skills
  getUserSkills(userId: number): Promise<UserSkill[]>;
  updateUserSkills(update: UserSkillUpdate): Promise<void>;
  
  // Reward Distributions
  getRewardDistribution(projectId: number): Promise<RewardDistribution | undefined>;
  createRewardDistribution(distribution: InsertRewardDistribution): Promise<RewardDistribution>;
  updateRewardDistribution(projectId: number, distribution: Partial<InsertRewardDistribution>): Promise<RewardDistribution>;
  calculateUserReward(projectId: number, userId: number): Promise<{ totalReward: number; percentage: number; amount: number } | undefined>;
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

  // Registration requests methods
  async getRegistrationRequests(): Promise<RegistrationRequest[]> {
    return await db.select().from(registrationRequests).orderBy(registrationRequests.createdAt);
  }

  async createRegistrationRequest(request: InsertRegistrationRequest): Promise<RegistrationRequest> {
    const [newRequest] = await db
      .insert(registrationRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateRegistrationRequestStatus(id: number, status: "APPROVED" | "REJECTED"): Promise<RegistrationRequest> {
    const [updated] = await db
      .update(registrationRequests)
      .set({ status })
      .where(eq(registrationRequests.id, id))
      .returning();
    return updated;
  }

  async getRegistrationRequest(id: number): Promise<RegistrationRequest | undefined> {
    const [request] = await db
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, id));
    return request;
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

    // アサイン情報を含む完全なプロジェクト情報を返す
    return this.getProject(project.id) as Promise<Project>;
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

    // アサイン情報を含む完全なプロジェクト情報を返す
    return this.getProject(id) as Promise<Project>;
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
  
  // Timeline post methods
  async getTimelinePosts(): Promise<TimelinePost[]> {
    return await db
      .select()
      .from(timelinePosts)
      .orderBy(timelinePosts.createdAt, "desc");
  }
  
  async getTimelinePostsByUser(userId: number): Promise<TimelinePost[]> {
    return await db
      .select()
      .from(timelinePosts)
      .where(eq(timelinePosts.userId, userId))
      .orderBy(timelinePosts.createdAt, "desc");
  }
  
  async getTimelinePost(id: number): Promise<TimelinePost | undefined> {
    const [post] = await db
      .select()
      .from(timelinePosts)
      .where(eq(timelinePosts.id, id));
    return post;
  }
  
  async createTimelinePost(post: InsertTimelinePost): Promise<TimelinePost> {
    const [newPost] = await db
      .insert(timelinePosts)
      .values(post)
      .returning();
    return newPost;
  }
  
  async deleteTimelinePost(id: number): Promise<void> {
    await db.delete(timelinePosts).where(eq(timelinePosts.id, id));
  }
  
  // Skills methods
  async getSkillCategories(): Promise<SkillCategory[]> {
    return await db
      .select()
      .from(skillCategories)
      .orderBy(skillCategories.displayOrder);
  }
  
  async getSkillCategory(id: number): Promise<SkillCategory | undefined> {
    const [category] = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.id, id));
    return category;
  }
  
  async createSkillCategory(category: InsertSkillCategory): Promise<SkillCategory> {
    const [newCategory] = await db
      .insert(skillCategories)
      .values(category)
      .returning();
    return newCategory;
  }
  
  async updateSkillCategory(id: number, category: Partial<InsertSkillCategory>): Promise<SkillCategory> {
    const [updated] = await db
      .update(skillCategories)
      .set(category)
      .where(eq(skillCategories.id, id))
      .returning();
    return updated;
  }
  
  async deleteSkillCategory(id: number): Promise<void> {
    // 先にこのカテゴリに関連するタグを削除する
    await db.delete(skillTags).where(eq(skillTags.categoryId, id));
    // カテゴリを削除
    await db.delete(skillCategories).where(eq(skillCategories.id, id));
  }
  
  // Skill Tags methods
  async getSkillTags(): Promise<SkillTag[]> {
    return await db
      .select()
      .from(skillTags)
      .orderBy([skillTags.categoryId, skillTags.displayOrder]);
  }
  
  async getSkillTagsByCategory(categoryId: number): Promise<SkillTag[]> {
    return await db
      .select()
      .from(skillTags)
      .where(eq(skillTags.categoryId, categoryId))
      .orderBy(skillTags.displayOrder);
  }
  
  async getSkillTag(id: number): Promise<SkillTag | undefined> {
    const [tag] = await db
      .select()
      .from(skillTags)
      .where(eq(skillTags.id, id));
    return tag;
  }
  
  async createSkillTag(tag: InsertSkillTag): Promise<SkillTag> {
    const [newTag] = await db
      .insert(skillTags)
      .values(tag)
      .returning();
    return newTag;
  }
  
  async updateSkillTag(id: number, tag: Partial<InsertSkillTag>): Promise<SkillTag> {
    const [updated] = await db
      .update(skillTags)
      .set(tag)
      .where(eq(skillTags.id, id))
      .returning();
    return updated;
  }
  
  async deleteSkillTag(id: number): Promise<void> {
    // タグを使用しているユーザースキルを削除
    await db.delete(userSkills).where(eq(userSkills.skillTagId, id));
    // タグを削除
    await db.delete(skillTags).where(eq(skillTags.id, id));
  }
  
  // User Skills methods
  async getUserSkills(userId: number): Promise<UserSkill[]> {
    return await db
      .select()
      .from(userSkills)
      .where(eq(userSkills.userId, userId));
  }
  
  async updateUserSkills(update: UserSkillUpdate): Promise<void> {
    const { userId, skillTagIds } = update;
    
    // 既存のユーザースキルを削除
    await db.delete(userSkills).where(eq(userSkills.userId, userId));
    
    // 新しいスキルを追加
    if (skillTagIds.length > 0) {
      await db.insert(userSkills).values(
        skillTagIds.map(skillTagId => ({
          userId,
          skillTagId
        }))
      );
    }
  }

  // 報酬分配メソッド
  async getRewardDistribution(projectId: number): Promise<RewardDistribution | undefined> {
    const [distribution] = await db
      .select()
      .from(rewardDistributions)
      .where(eq(rewardDistributions.projectId, projectId));
    return distribution;
  }

  async createRewardDistribution(distribution: InsertRewardDistribution): Promise<RewardDistribution> {
    const [newDistribution] = await db
      .insert(rewardDistributions)
      .values(distribution)
      .returning();
    return newDistribution;
  }

  async updateRewardDistribution(projectId: number, distribution: Partial<InsertRewardDistribution>): Promise<RewardDistribution> {
    const [updated] = await db
      .update(rewardDistributions)
      .set(distribution)
      .where(eq(rewardDistributions.projectId, projectId))
      .returning();
    return updated;
  }

  async calculateUserReward(projectId: number, userId: number): Promise<{ totalReward: number; percentage: number; amount: number } | undefined> {
    // プロジェクト情報を取得
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    // 報酬分配情報を取得
    const distribution = await this.getRewardDistribution(projectId);
    if (!distribution) return undefined;

    // ユーザーの役割を計算
    const isDirector = project.directorId === userId;
    const isSales = project.salesId === userId;
    const isCreator = project.assignedUsers?.includes(userId) || false;

    // 該当するロールが無い場合は報酬なし
    if (!isDirector && !isSales && !isCreator) return undefined;

    // ユーザーの報酬割合を計算
    let percentage = 0;
    if (isDirector) percentage += distribution.directorPercentage;
    if (isSales) percentage += distribution.salesPercentage;

    // クリエイターの場合、クリエイター報酬を担当者数で分配
    if (isCreator) {
      const creatorCount = project.assignedUsers?.length || 1;
      percentage += distribution.creatorPercentage / creatorCount;
    }

    // 報酬額を計算
    const amount = Math.round(project.totalReward * (percentage / 100));

    return {
      totalReward: project.totalReward,
      percentage,
      amount
    };
  }
}

export const storage = new DatabaseStorage();
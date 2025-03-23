import { pgTable, text, serial, integer, timestamp, boolean as pgBoolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const projectStatus = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const;
export type ProjectStatus = (typeof projectStatus)[number];

export const userRoles = ["ADMIN", "DIRECTOR", "SALES", "CREATOR"] as const;
export type UserRole = (typeof userRoles)[number];

// 登録リクエスト用のロール（ADMINを除外）
export const registrationRoles = ["DIRECTOR", "SALES", "CREATOR"] as const;
export type RegistrationRole = (typeof registrationRoles)[number];

export const workTypes = ["DESIGN", "DEVELOPMENT", "WRITING", "VIDEO", "PHOTO"] as const;
export type WorkType = (typeof workTypes)[number];

// ユーザー登録リクエストテーブルを追加
export const registrationRequests = pgTable("registration_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  approved: pgBoolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // プロフィール関連のフィールドを追加
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  title: text("title"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: projectStatus }).notNull().default("NOT_STARTED"),
  dueDate: timestamp("due_date").notNull(),
  clientName: text("client_name").notNull(),
  clientContact: text("client_contact").notNull(),
  history: text("history").notNull(),
  totalReward: integer("total_reward").notNull(),
  rewardRules: text("reward_rules").notNull(),
  rewardDistributed: pgBoolean("reward_distributed").notNull().default(false),
  directorId: integer("director_id").references(() => users.id),
  salesId: integer("sales_id").references(() => users.id),
});

export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
});

// プロジェクトアサインメントのリレーション
export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectAssignments.userId],
    references: [users.id],
  }),
}));

// プロジェクトのリレーション
export const projectsRelations = relations(projects, ({ many }) => ({
  assignments: many(projectAssignments),
  comments: many(comments),
  portfolios: many(portfolios),
}));

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  workType: text("work_type", { enum: workTypes }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const portfoliosRelations = relations(portfolios, ({ one }) => ({
  project: one(projects, {
    fields: [portfolios.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
}));

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  createdAt: true
}).extend({
  projectId: z.number().int().positive(),
  userId: z.number().int().positive(),
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().min(1, "説明は必須です"),
  url: z.string().url("有効なURLを入力してください"),
  workType: z.enum(workTypes, {
    errorMap: () => ({ message: "作業種別を選択してください" })
  })
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  rewardDistributed: true
}).extend({
  assignedUsers: z.array(z.number()),
  directorId: z.number().optional(),
  salesId: z.number().optional(),
  dueDate: z.coerce.date()
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true
}).extend({
  role: z.enum(userRoles)
});

export const authUserSchema = z.object({
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

export const registerUserSchema = insertUserSchema.extend({
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: "役割を選択してください" })
  })
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "認証トークンは必須です"),
});

export const updateUserSchema = insertUserSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(6, "新しいパスワードは6文字以上で入力してください"),
  confirmPassword: z.string().min(1, "パスワードの確認を入力してください")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "新しいパスワードと確認用パスワードが一致しません",
  path: ["confirmPassword"],
});

export type ChangePassword = z.infer<typeof changePasswordSchema>;

// 基本的なプロジェクト型を拡張して、アサイン済みユーザーを含める
export type Project = typeof projects.$inferSelect & {
  assignedUsers?: number[];
};
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof registerUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;


// 登録リクエスト用のスキーマを更新
export const registrationRequestSchema = createInsertSchema(registrationRequests).omit({
  id: true,
  status: true,
  createdAt: true,
}).extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  role: z.enum(registrationRoles, {
    errorMap: () => ({ message: "役割を選択してください" })
  })
});

export type RegistrationRequest = typeof registrationRequests.$inferSelect;
export type InsertRegistrationRequest = z.infer<typeof registrationRequestSchema>;

// ユーザープロフィール更新用のスキーマを追加
export const updateProfileSchema = z.object({
  avatarUrl: z.string().url("有効な画像URLを入力してください").optional().nullable(),
  bio: z.string().max(500, "プロフィール文は500文字以内で入力してください").optional().nullable(),
  title: z.string().max(100, "肩書きは100文字以内で入力してください").optional().nullable(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// タイムラインポストのテーブル定義
export const timelinePosts = pgTable("timeline_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// タイムラインポストとユーザーのリレーション定義
export const timelinePostsRelations = relations(timelinePosts, ({ one }) => ({
  user: one(users, {
    fields: [timelinePosts.userId],
    references: [users.id],
  }),
}));

// タイムラインポスト挿入用のスキーマ
export const insertTimelinePostSchema = createInsertSchema(timelinePosts).omit({
  id: true,
  createdAt: true
}).extend({
  content: z.string().min(1, "投稿内容は必須です").max(140, "投稿は140文字以内で入力してください"),
});

export type TimelinePost = typeof timelinePosts.$inferSelect;
export type InsertTimelinePost = z.infer<typeof insertTimelinePostSchema>;

// スキルカテゴリとスキルタグの定義
export const skillCategories = pgTable("skill_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const skillTags = pgTable("skill_tags", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => skillCategories.id),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

// カテゴリとスキルタグのリレーション
export const skillCategoriesRelations = relations(skillCategories, ({ many }) => ({
  tags: many(skillTags),
}));

export const skillTagsRelations = relations(skillTags, ({ one }) => ({
  category: one(skillCategories, {
    fields: [skillTags.categoryId],
    references: [skillCategories.id],
  }),
}));

// ユーザーとスキルタグの関連付けテーブル
export const userSkills = pgTable("user_skills", {
  userId: integer("user_id").notNull().references(() => users.id),
  skillTagId: integer("skill_tag_id").notNull().references(() => skillTags.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.skillTagId] }),
  }
});

// ユーザーとスキルタグのリレーション
export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, {
    fields: [userSkills.userId],
    references: [users.id],
  }),
  skillTag: one(skillTags, {
    fields: [userSkills.skillTagId],
    references: [skillTags.id],
  }),
}));

// ユーザーリレーションの更新
export const usersRelations = relations(users, ({ many }) => ({
  skills: many(userSkills),
}));

// スキーマ定義
export const insertSkillCategorySchema = createInsertSchema(skillCategories).omit({
  id: true,
});

export const insertSkillTagSchema = createInsertSchema(skillTags).omit({
  id: true,
});

export const userSkillSchema = z.object({
  userId: z.number().int().positive(),
  skillTagIds: z.array(z.number().int().positive()),
});

export type SkillCategory = typeof skillCategories.$inferSelect;
export type InsertSkillCategory = z.infer<typeof insertSkillCategorySchema>;
export type SkillTag = typeof skillTags.$inferSelect;
export type InsertSkillTag = z.infer<typeof insertSkillTagSchema>;
export type UserSkill = typeof userSkills.$inferSelect;
export type UserSkillUpdate = z.infer<typeof userSkillSchema>;
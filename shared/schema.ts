import { pgTable, text, serial, integer, timestamp, boolean as pgBoolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const projectStatus = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const;
export type ProjectStatus = (typeof projectStatus)[number];

// ADMINロールを追加
export const userRoles = ["ADMIN", "DIRECTOR", "SALES", "CREATOR"] as const;
export type UserRole = (typeof userRoles)[number];

export const workTypes = ["DESIGN", "DEVELOPMENT", "WRITING", "VIDEO", "PHOTO"] as const;
export type WorkType = (typeof workTypes)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof registerUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;
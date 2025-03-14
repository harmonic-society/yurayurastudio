import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projectStatus = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const;
export type ProjectStatus = (typeof projectStatus)[number];

export const userRoles = ["DIRECTOR", "SALES", "CREATOR"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: userRoles }).notNull(),
  email: text("email").notNull().unique(),
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
  rewardDistributed: boolean("reward_distributed").notNull().default(false),
});

export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true,
  rewardDistributed: true 
}).extend({
  assignedUsers: z.array(z.number())
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

export const updateUserSchema = insertUserSchema.partial();

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
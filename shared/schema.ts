import { pgTable, text, serial, integer, timestamp, boolean as pgBoolean, primaryKey, json } from "drizzle-orm/pg-core";
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
  // 報酬分配率（％）
  operationFeeRate: integer("operation_fee_rate").notNull().default(10), // 運営費: デフォルト10%
  salesRate: integer("sales_rate").notNull().default(15), // 営業担当: デフォルト15%
  directorRate: integer("director_rate").notNull().default(25), // ディレクター担当: デフォルト25%
  creatorRate: integer("creator_rate").notNull().default(50), // クリエイター担当: デフォルト50%
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
// 報酬分配テーブル
export const rewardDistributions = pgTable("reward_distributions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  operationPercentage: integer("operation_percentage").notNull().default(10), // 運営費は固定10%
  salesPercentage: integer("sales_percentage").notNull().default(0),
  directorPercentage: integer("director_percentage").notNull().default(0),
  creatorPercentage: integer("creator_percentage").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 報酬分配のリレーション
export const rewardDistributionsRelations = relations(rewardDistributions, ({ one }) => ({
  project: one(projects, {
    fields: [rewardDistributions.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  assignments: many(projectAssignments),
  comments: many(comments),
  rewardDistribution: one(rewardDistributions),
  files: many(projectFiles),
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
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id), // プロジェクトとの紐付け（オプション）
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull().default(""), // デフォルト値を空文字に設定（ファイルアップロード時用）
  workType: text("work_type", { enum: workTypes }).notNull(),
  imageUrl: text("image_url"), // プレビュー画像のURL（OGP画像をキャッシュする場合に使用）
  filePath: text("file_path"), // アップロードしたファイルのパス
  fileType: text("file_type"), // ファイルの種類（MIME type）
  isPublic: pgBoolean("is_public").notNull().default(true), // 公開/非公開設定
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ポートフォリオファイル（複数ファイル対応）
export const portfolioFiles = pgTable("portfolio_files", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [portfolios.projectId],
    references: [projects.id],
  }),
  files: many(portfolioFiles),
}));

export const portfolioFilesRelations = relations(portfolioFiles, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioFiles.portfolioId],
    references: [portfolios.id],
  }),
}));

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  createdAt: true
}).extend({
  userId: z.number().int().positive(),
  projectId: z.number().int().positive().optional().nullable(), // プロジェクトIDはオプション
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().min(1, "説明は必須です").max(500, "説明は500文字以内で入力してください"),
  url: z.string().default("")
    .transform(val => val === null ? "" : val) // null値を空文字列に変換
    .refine(
      (url) => {
        // 空文字列の場合は有効（ファイルアップロードモードの場合）
        if (!url || url.trim().length === 0) {
          return true;
        }
        
        // 値が入力されている場合は有効なURLかチェック
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "有効なURLを入力してください"
      }
    ),
  workType: z.enum(workTypes, {
    errorMap: () => ({ message: "作業種別を選択してください" })
  }),
  imageUrl: z.string().optional().nullable(),
  filePath: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  isPublic: z.boolean().default(true)
})
// URLとファイルパスの相互依存チェックは削除 - フォームコンポーネント側でモードに応じた検証を行う

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

// Extended Portfolio type with project information
export type PortfolioWithProject = Portfolio & {
  project?: Project | null;
};
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

// 報酬分配に関するスキーマ
export const insertRewardDistributionSchema = createInsertSchema(rewardDistributions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  operationPercentage: true, // 運営費は固定10%のため
}).extend({
  projectId: z.number().int().positive(),
  salesPercentage: z.number().int().min(0).max(90),
  directorPercentage: z.number().int().min(0).max(90),
  creatorPercentage: z.number().int().min(0).max(90),
}).superRefine((data, ctx) => {
  const total = 10 + data.salesPercentage + data.directorPercentage + data.creatorPercentage;
  if (total !== 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `報酬の合計は100%である必要があります。現在: ${total}%`,
    });
  }
});

export type RewardDistribution = typeof rewardDistributions.$inferSelect;
export type InsertRewardDistribution = z.infer<typeof insertRewardDistributionSchema>;

// 通知設定のEnum
export const notificationEvents = [
  "PROJECT_CREATED", 
  "PROJECT_UPDATED", 
  "PROJECT_COMMENTED", 
  "PROJECT_COMPLETED", 
  "REWARD_DISTRIBUTED",
  "REGISTRATION_APPROVED",
  "PROJECT_ASSIGNED",
  "REGISTRATION_REQUEST",
  "COMMENT_MENTION",
  "DIRECT_MESSAGE"
] as const;
export type NotificationEvent = (typeof notificationEvents)[number];

// 通知設定テーブル
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // アプリ内通知設定
  notifyProjectCreated: pgBoolean("notify_project_created").notNull().default(true),
  notifyProjectUpdated: pgBoolean("notify_project_updated").notNull().default(true),
  notifyProjectCommented: pgBoolean("notify_project_commented").notNull().default(true),
  notifyProjectCompleted: pgBoolean("notify_project_completed").notNull().default(true),
  notifyRewardDistributed: pgBoolean("notify_reward_distributed").notNull().default(true),
  notifyRegistrationApproved: pgBoolean("notify_registration_approved").notNull().default(true),
  notifyProjectAssigned: pgBoolean("notify_project_assigned").notNull().default(true),
  notifyRegistrationRequest: pgBoolean("notify_registration_request").notNull().default(true),
  notifyCommentMention: pgBoolean("notify_comment_mention").notNull().default(true),
  notifyDirectMessage: pgBoolean("notify_direct_message").notNull().default(true),
  // メール通知設定
  emailNotifyProjectCreated: pgBoolean("email_notify_project_created").notNull().default(true),
  emailNotifyProjectUpdated: pgBoolean("email_notify_project_updated").notNull().default(true),
  emailNotifyProjectCommented: pgBoolean("email_notify_project_commented").notNull().default(true),
  emailNotifyProjectCompleted: pgBoolean("email_notify_project_completed").notNull().default(true),
  emailNotifyRewardDistributed: pgBoolean("email_notify_reward_distributed").notNull().default(true),
  emailNotifyRegistrationApproved: pgBoolean("email_notify_registration_approved").notNull().default(true),
  emailNotifyProjectAssigned: pgBoolean("email_notify_project_assigned").notNull().default(true),
  emailNotifyRegistrationRequest: pgBoolean("email_notify_registration_request").notNull().default(true),
  emailNotifyCommentMention: pgBoolean("email_notify_comment_mention").notNull().default(true),
  emailNotifyDirectMessage: pgBoolean("email_notify_direct_message").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 通知設定とユーザーのリレーション
export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));

// 通知履歴テーブル
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  event: text("event", { enum: notificationEvents }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  read: pgBoolean("read").notNull().default(false),
});

// 通知履歴とユーザーのリレーション
export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  user: one(users, {
    fields: [notificationHistory.userId],
    references: [users.id],
  }),
}));

// 挿入スキーマの定義
export const insertNotificationSettingSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  createdAt: true,
  read: true,
}).extend({
  event: z.enum(notificationEvents, {
    errorMap: () => ({ message: "有効な通知イベントを選択してください" })
  }),
  title: z.string().min(1, "タイトルは必須です"),
  message: z.string().min(1, "メッセージは必須です"),
  link: z.string().nullable().optional(),
});

// ユーザーリレーションの定義（スキル、ポートフォリオ、通知を含む）
export const usersRelations = relations(users, ({ many }) => ({
  skills: many(userSkills),
  portfolios: many(portfolios),
  notificationSettings: many(notificationSettings),
  notificationHistory: many(notificationHistory),
}));

// ダイレクトメッセージテーブル
export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  read: pgBoolean("read").notNull().default(false),
});

// ダイレクトメッセージとユーザーのリレーション
export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  fromUser: one(users, {
    fields: [directMessages.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [directMessages.toUserId],
    references: [users.id],
  }),
}));

// ユーザーリレーションを更新（ダイレクトメッセージを追加）
export const directMessagesUsersRelations = relations(users, ({ many }) => ({
  sentMessages: many(directMessages, { relationName: "sentMessages" }),
  receivedMessages: many(directMessages, { relationName: "receivedMessages" }),
}));

// ダイレクトメッセージスキーマ
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
  read: true,
}).extend({
  message: z.string().min(1, "メッセージは必須です"),
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = z.infer<typeof insertNotificationSettingSchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;

// プロジェクトファイル管理テーブル
export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(), // S3のキーまたはGoogle DriveのID
  fileType: text("file_type").notNull(), // MIMEタイプ
  fileSize: integer("file_size").notNull(), // バイト単位
  description: text("description"), // ファイルの説明（オプション）
  sourceType: text("source_type").notNull().default("upload"), // 'upload' | 'google_drive'
  googleDriveId: text("google_drive_id"), // Google DriveファイルID
  googleDriveUrl: text("google_drive_url"), // Google DriveファイルのURL
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// プロジェクトファイルのリレーション
export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
  uploadedByUser: one(users, {
    fields: [projectFiles.uploadedBy],
    references: [users.id],
  }),
}));

// プロジェクトファイル挿入用のスキーマ
export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
}).extend({
  projectId: z.number().int().positive(),
  uploadedBy: z.number().int().positive(),
  fileName: z.string().min(1, "ファイル名は必須です"),
  filePath: z.string().min(1, "ファイルパスは必須です"),
  fileType: z.string().min(1, "ファイルタイプは必須です"),
  fileSize: z.number().int().positive(),
  description: z.string().optional().nullable(),
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
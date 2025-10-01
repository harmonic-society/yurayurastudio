import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// 管理者権限チェック
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "認証が必要です" });
  }

  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "管理者権限が必要です" });
  }

  next();
}

// プロジェクトステータス変更の権限チェック
export function canUpdateProjectStatus(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "認証が必要です" });
  }

  // ステータス変更のみの場合は許可
  const updates = req.body;
  if (Object.keys(updates).length === 1 && 'status' in updates) {
    return next();
  }

  // それ以外の変更は管理者のみ
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "このアクションには管理者権限が必要です" });
  }

  next();
}

// パスワード変更の権限チェック
export function canChangePassword(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "認証が必要です" });
  }

  // ユーザーは自分のパスワードのみ変更可能
  const userId = parseInt(req.params.id);
  if (userId !== req.user?.id && req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "他のユーザーのパスワードは変更できません" });
  }

  next();
}

// プロジェクトアクセス権限チェック（全ユーザーが閲覧可能）
export async function canAccessProject(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "認証が必要です" });
  }

  const projectId = parseInt(req.params.id);
  const project = await storage.getProject(projectId);

  if (!project) {
    return res.status(404).json({ message: "プロジェクトが見つかりません" });
  }

  // 全ての認証済みユーザーがプロジェクトを閲覧可能
  next();
}

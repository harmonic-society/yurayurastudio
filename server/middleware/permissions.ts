import { Request, Response, NextFunction } from "express";

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

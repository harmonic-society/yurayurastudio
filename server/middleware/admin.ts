import { Request, Response, NextFunction } from "express";

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "認証が必要です" });
  }

  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "管理者権限が必要です" });
  }

  next();
}

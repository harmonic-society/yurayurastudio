import { hashPassword } from "./auth";
import { storage } from "./storage";

async function createAdminUser() {
  try {
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("管理者アカウントは既に存在します");
      return;
    }

    const hashedPassword = await hashPassword("admin123");
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      name: "システム管理者",
      email: "admin@example.com",
      role: "ADMIN"
    });

    console.log("管理者アカウントを作成しました");
  } catch (error) {
    console.error("管理者アカウントの作成に失敗しました:", error);
  }
}

createAdminUser();

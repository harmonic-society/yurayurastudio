import { storage } from "./storage.js";
import { hashPassword } from "./auth";

async function resetPasswords() {
  try {
    const users = await storage.getUsers();
    const initialPassword = "password";
    const hashedPassword = await hashPassword(initialPassword);

    for (const user of users) {
      await storage.updateUser(user.id, { password: hashedPassword });
      console.log(`Updated password for user: ${user.username} (ID: ${user.id})`);
    }

    console.log("すべてのユーザーのパスワードを更新しました");
  } catch (error) {
    console.error("ユーザーパスワードの更新に失敗しました:", error);
  }
}

resetPasswords();
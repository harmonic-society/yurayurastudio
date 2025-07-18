import { storage } from "./storage.js";
import { hashPassword } from "./auth";

async function setInitialPasswords() {
  try {
    const users = await storage.getUsers();
    const initialPassword = "yurayurastudio";
    const hashedPassword = await hashPassword(initialPassword);

    for (const user of users) {
      if (user.username !== "admin") {
        await storage.updateUser(user.id, { password: hashedPassword });
        console.log(`Updated password for user: ${user.username} (ID: ${user.id})`);
      }
    }

    console.log("すべてのユーザーのパスワードを更新しました");
  } catch (error) {
    console.error("ユーザーパスワードの更新に失敗しました:", error);
  }
}

setInitialPasswords();
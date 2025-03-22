import { storage } from "./storage";
import { hashPassword } from "./auth";

async function setInitialPasswords() {
  try {
    const users = await storage.getUsers();
    const initialPassword = "admin123";
    const hashedPassword = await hashPassword(initialPassword);

    for (const user of users) {
      if (user.username !== "admin") {
        await storage.updateUser(user.id, { password: hashedPassword });
        console.log(`Updated password for user: ${user.username}`);
      }
    }

    console.log("All user passwords have been updated");
  } catch (error) {
    console.error("Failed to update user passwords:", error);
  }
}

setInitialPasswords();

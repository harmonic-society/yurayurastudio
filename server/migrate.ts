import { db } from "./db";
import { users } from "@shared/schema";

async function main() {
  // Insert initial users
  await db.insert(users).values([
    { name: "John Director", role: "DIRECTOR", email: "john@example.com" },
    { name: "Sarah Sales", role: "SALES", email: "sarah@example.com" },
    { name: "Mike Creator", role: "CREATOR", email: "mike@example.com" }
  ]);

  console.log("Initial data seeded successfully");
}

main().catch(console.error);

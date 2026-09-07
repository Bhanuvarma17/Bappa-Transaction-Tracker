import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { withTransaction, isDbConfigured } from "./db";

interface JsonUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

interface JsonProfile {
  userId: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  bio: string;
  profileImage: string;
  capital: number;
  currency: string;
  updatedAt: string;
}

interface JsonExpense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface JsonSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
}

interface JsonStore {
  users?: JsonUser[];
  profiles?: JsonProfile[];
  expenses?: JsonExpense[];
  sessions?: JsonSession[];
}

export async function runMigration(): Promise<{
  success: boolean;
  usersMigrated: number;
  profilesMigrated: number;
  expensesMigrated: number;
  sessionsMigrated: number;
}> {
  const storePath = path.join(process.cwd(), "data", "store.json");

  if (!fs.existsSync(storePath)) {
    console.log("No data/store.json file found to migrate. Skipping.");
    return {
      success: true,
      usersMigrated: 0,
      profilesMigrated: 0,
      expensesMigrated: 0,
      sessionsMigrated: 0,
    };
  }

  if (!isDbConfigured()) {
    throw new Error("Cannot run migration: DATABASE_URL environment variable is not configured.");
  }

  let store: JsonStore;
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    store = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(`Failed to parse data/store.json: ${err.message}`);
  }

  const users = store.users || [];
  const profiles = store.profiles || [];
  const expenses = store.expenses || [];
  const sessions = store.sessions || [];

  console.log(`Starting migration: ${users.length} users, ${profiles.length} profiles, ${expenses.length} expenses found in JSON.`);

  return await withTransaction(async (client) => {
    let usersMigrated = 0;
    let profilesMigrated = 0;
    let expensesMigrated = 0;
    let sessionsMigrated = 0;

    // 1. Migrate Users
    for (const u of users) {
      const existingUser = await client.query(
        "SELECT id FROM users WHERE id = $1 OR LOWER(email) = LOWER($2)",
        [u.id, u.email]
      );

      if (existingUser.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, email, password_hash, password_salt, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            u.id,
            u.email.toLowerCase().trim(),
            u.passwordHash,
            u.passwordSalt || "legacy_pbkdf2",
            u.createdAt ? new Date(u.createdAt) : new Date(),
          ]
        );
        usersMigrated++;
      } else {
        console.log(`User ${u.email} (${u.id}) already exists in PostgreSQL, skipping.`);
      }
    }

    // 2. Migrate Profiles
    for (const p of profiles) {
      // Ensure associated user exists in Postgres
      const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [p.userId]);
      if (userCheck.rows.length === 0) {
        console.warn(`Skipping profile for non-existent user ${p.userId}`);
        continue;
      }

      const existingProfile = await client.query(
        "SELECT user_id FROM profiles WHERE user_id = $1 OR normalized_username = $2",
        [p.userId, p.normalizedUsername.toLowerCase().trim()]
      );

      if (existingProfile.rows.length === 0) {
        await client.query(
          `INSERT INTO profiles (user_id, username, normalized_username, display_name, bio, profile_image, capital, currency, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            p.userId,
            p.username.trim(),
            p.normalizedUsername.toLowerCase().trim(),
            p.displayName || p.username,
            p.bio || "",
            p.profileImage || "",
            p.capital ?? 50000,
            p.currency || "₹",
            p.updatedAt ? new Date(p.updatedAt) : new Date(),
          ]
        );
        profilesMigrated++;
      } else {
        console.log(`Profile for user ${p.userId} already exists in PostgreSQL, skipping.`);
      }
    }

    // 3. Migrate Expenses
    for (const e of expenses) {
      const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [e.userId]);
      if (userCheck.rows.length === 0) {
        console.warn(`Skipping expense ${e.id} for non-existent user ${e.userId}`);
        continue;
      }

      const existingExpense = await client.query(
        "SELECT id FROM expenses WHERE id = $1",
        [e.id]
      );

      if (existingExpense.rows.length === 0) {
        await client.query(
          `INSERT INTO expenses (id, user_id, title, amount, category, date, notes, expense_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            e.id,
            e.userId,
            e.title.trim(),
            e.amount,
            e.category || "Miscellaneous",
            e.date || new Date().toISOString().split("T")[0],
            e.notes || "",
            e.order ?? 0,
            e.createdAt ? new Date(e.createdAt) : new Date(),
            e.updatedAt ? new Date(e.updatedAt) : new Date(),
          ]
        );
        expensesMigrated++;
      } else {
        console.log(`Expense ${e.id} already exists in PostgreSQL, skipping.`);
      }
    }

    // 4. Migrate Sessions safely (only active sessions)
    const now = Date.now();
    for (const s of sessions) {
      if (s.expiresAt > now) {
        const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [s.userId]);
        if (userCheck.rows.length === 0) continue;

        const tokenHash = crypto.createHash("sha256").update(s.token).digest("hex");
        const existingSession = await client.query(
          "SELECT token_hash FROM sessions WHERE token_hash = $1",
          [tokenHash]
        );

        if (existingSession.rows.length === 0) {
          await client.query(
            `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [
              tokenHash,
              s.userId,
              s.createdAt ? new Date(s.createdAt) : new Date(),
              new Date(s.expiresAt),
            ]
          );
          sessionsMigrated++;
        }
      }
    }

    console.log(`Migration complete: ${usersMigrated} users, ${profilesMigrated} profiles, ${expensesMigrated} expenses, ${sessionsMigrated} sessions inserted.`);

    return {
      success: true,
      usersMigrated,
      profilesMigrated,
      expensesMigrated,
      sessionsMigrated,
    };
  });
}

// Allow direct execution: node or tsx server/migrate-json-to-pg.ts
if (process.argv[1]?.includes("migrate-json-to-pg")) {
  runMigration()
    .then((res) => {
      console.log("Migration executed successfully:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed and rolled back:", err.message);
      process.exit(1);
    });
}

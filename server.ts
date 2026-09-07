import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import {
  isDbConfigured,
  query,
  withTransaction,
  ensureSchema,
} from "./server/db";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "./server/auth";

interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Rate limiters for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in a few minutes." },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password change attempts. Please try again in 15 minutes." },
});

// Periodic expired session cleanup (every 1 hour)
setInterval(async () => {
  try {
    if (isDbConfigured()) {
      await query("DELETE FROM sessions WHERE expires_at < NOW()");
    }
  } catch (err: any) {
    console.error("Failed to clean up expired sessions:", err.message);
  }
}, 60 * 60 * 1000);

// Ensure PostgreSQL schema whenever DB is configured
app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  if (isDbConfigured()) {
    try {
      await ensureSchema();
    } catch (err: any) {
      console.error("Failed to ensure database schema:", err.message);
    }
  }
  next();
});

// Helper to format an expense row from PostgreSQL to client structure
function formatExpense(row: any) {
  let formattedDate: string;
  if (row.date instanceof Date) {
    formattedDate = row.date.toISOString().split("T")[0];
  } else if (typeof row.date === "string") {
    formattedDate = row.date.split("T")[0];
  } else {
    formattedDate = new Date().toISOString().split("T")[0];
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    amount: parseFloat(row.amount),
    category: row.category,
    date: formattedDate,
    notes: row.notes || "",
    order: Number(row.expense_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to format a profile row from PostgreSQL
function formatProfile(row: any) {
  return {
    userId: row.user_id,
    username: row.username,
    normalizedUsername: row.normalized_username,
    displayName: row.display_name || row.username,
    bio: row.bio || "",
    profileImage: row.profile_image || "",
    capital: parseFloat(row.capital),
    currency: row.currency || "₹",
    updatedAt: row.updated_at,
  };
}

// Authentication Middleware
async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isDbConfigured()) {
    res.status(503).json({ error: "Database is not configured. Please set DATABASE_URL." });
    return;
  }

  const cookieToken = req.cookies[SESSION_COOKIE_NAME];
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

  const rawToken = cookieToken || bearerToken;
  if (!rawToken) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const tokenHash = hashSessionToken(rawToken);

    const sessionResult = await query(
      `SELECT s.token_hash, s.user_id, s.expires_at, u.id, u.email, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
      });
      res.status(401).json({ error: "Session invalid or expired. Please log in again." });
      return;
    }

    const sessionRow = sessionResult.rows[0];
    const expiresAt = new Date(sessionRow.expires_at).getTime();

    if (expiresAt < Date.now()) {
      await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]).catch(() => {});
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
      });
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }

    req.user = {
      id: sessionRow.id,
      email: sessionRow.email,
      createdAt: sessionRow.created_at,
    };

    // Proceed to next handler exactly once
    next();
  } catch (err: any) {
    console.error("Authentication error:", err.message);
    res.status(500).json({ error: "Authentication service failure." });
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get("/api/health", async (req: Request, res: Response) => {
  const dbStatus = isDbConfigured();
  res.json({
    status: "ok",
    database: dbStatus ? "configured" : "unconfigured",
    environment: process.env.NODE_ENV || "development",
  });
});

// 2. Public committee username availability check
app.get("/api/auth/check-username", async (req: Request, res: Response) => {
  if (!isDbConfigured()) {
    res.status(503).json({ error: "Database not configured." });
    return;
  }

  const rawUsername = typeof req.query.username === "string" ? req.query.username : "";
  const cleanUsername = rawUsername.trim();

  if (!cleanUsername) {
    res.status(400).json({ error: "Username query parameter is required." });
    return;
  }

  const normalized = cleanUsername.toLowerCase();
  const valid = /^[a-zA-Z0-9_-]+$/.test(cleanUsername);

  if (!valid || cleanUsername.length < 3 || cleanUsername.length > 40) {
    res.json({
      available: false,
      message: "Committee name must be 3-40 alphanumeric characters, hyphens, or underscores.",
    });
    return;
  }

  try {
    const result = await query(
      "SELECT user_id FROM profiles WHERE normalized_username = $1",
      [normalized]
    );

    const isAvailable = result.rows.length === 0;
    res.json({
      available: isAvailable,
      normalizedUsername: normalized,
      message: isAvailable ? "Committee name is available!" : "Committee name is already taken.",
    });
  } catch (err: any) {
    console.error("Error checking username availability:", err.message);
    res.status(500).json({ error: "Failed to check username availability." });
  }
});

// 3. Signup
app.post("/api/auth/signup", authLimiter, async (req: Request, res: Response) => {
  if (!isDbConfigured()) {
    res.status(503).json({ error: "Database is not configured. Please set DATABASE_URL." });
    return;
  }

  const { email, password, username, displayName, capital } = req.body || {};

  // Validation
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 255) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  if (typeof password !== "string" || password.length < 6 || password.length > 128) {
    res.status(400).json({ error: "Password must be between 6 and 128 characters." });
    return;
  }

  const cleanUsername = typeof username === "string" ? username.trim() : "";
  if (!cleanUsername || !/^[a-zA-Z0-9_-]{3,40}$/.test(cleanUsername)) {
    res.status(400).json({
      error: "Username must be 3 to 40 characters containing letters, numbers, hyphens, or underscores.",
    });
    return;
  }
  const normalizedUsername = cleanUsername.toLowerCase();

  const cleanDisplayName =
    typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim().slice(0, 100)
      : cleanUsername;

  const numCapital = typeof capital === "number" ? capital : parseFloat(capital);
  const validatedCapital = isNaN(numCapital) || numCapital < 0 ? 50000 : Math.min(numCapital, 1000000000);

  try {
    const { user, profile, rawToken } = await withTransaction(async (client) => {
      // Check existing email
      const emailCheck = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = $1",
        [cleanEmail]
      );
      if (emailCheck.rows.length > 0) {
        throw { status: 400, message: "An account with this email already exists." };
      }

      // Check existing username
      const usernameCheck = await client.query(
        "SELECT user_id FROM profiles WHERE normalized_username = $1",
        [normalizedUsername]
      );
      if (usernameCheck.rows.length > 0) {
        throw { status: 400, message: "This committee username is already taken. Please choose another." };
      }

      const userId = `user_${crypto.randomUUID()}`;
      const { hash, salt } = await hashPassword(password);

      // Insert user
      const userRes = await client.query(
        `INSERT INTO users (id, email, password_hash, password_salt, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, email, created_at`,
        [userId, cleanEmail, hash, salt]
      );

      // Insert profile
      const profileRes = await client.query(
        `INSERT INTO profiles (user_id, username, normalized_username, display_name, bio, profile_image, capital, currency, updated_at)
         VALUES ($1, $2, $3, $4, '', '', $5, '₹', NOW())
         RETURNING user_id, username, normalized_username, display_name, bio, profile_image, capital, currency, updated_at`,
        [userId, cleanUsername, normalizedUsername, cleanDisplayName, validatedCapital]
      );

      // Create session
      const { rawToken: token, tokenHash } = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

      await client.query(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
         VALUES ($1, $2, NOW(), $3)`,
        [tokenHash, userId, expiresAt]
      );

      return {
        user: {
          id: userRes.rows[0].id,
          email: userRes.rows[0].email,
          createdAt: userRes.rows[0].created_at,
        },
        profile: formatProfile(profileRes.rows[0]),
        rawToken: token,
      };
    });

    // Set secure HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS,
      path: "/",
    });

    res.status(201).json({ user, profile });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Signup error:", err.message);
      res.status(500).json({ error: "An unexpected error occurred during account creation." });
    }
  }
});

// 4. Login
app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
  if (!isDbConfigured()) {
    res.status(503).json({ error: "Database is not configured. Please set DATABASE_URL." });
    return;
  }

  const { identifier, password } = req.body || {};

  const cleanIdentifier = typeof identifier === "string" ? identifier.trim() : "";
  if (!cleanIdentifier || typeof password !== "string" || !password) {
    res.status(400).json({ error: "Username/email and password are required." });
    return;
  }

  try {
    let userQuery = "";
    let params: any[] = [];

    if (cleanIdentifier.includes("@")) {
      userQuery = "SELECT * FROM users WHERE LOWER(email) = LOWER($1)";
      params = [cleanIdentifier];
    } else {
      userQuery = `
        SELECT u.* FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE p.normalized_username = LOWER($1)
      `;
      params = [cleanIdentifier];
    }

    const userResult = await query(userQuery, params);
    if (userResult.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials. Please check your username/email and password." });
      return;
    }

    const userRow = userResult.rows[0];
    const { valid, needsRehash } = await verifyPassword(password, userRow.password_hash, userRow.password_salt);

    if (!valid) {
      res.status(401).json({ error: "Invalid credentials. Please check your username/email and password." });
      return;
    }

    // Opportunistically upgrade hash to Argon2id if it was legacy PBKDF2
    if (needsRehash) {
      const { hash, salt } = await hashPassword(password);
      await query(
        "UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3",
        [hash, salt, userRow.id]
      ).catch(() => {});
    }

    // Fetch profile
    const profileResult = await query("SELECT * FROM profiles WHERE user_id = $1", [userRow.id]);
    if (profileResult.rows.length === 0) {
      res.status(500).json({ error: "Profile not found for this account." });
      return;
    }

    // Create session in PostgreSQL
    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await query(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3)`,
      [tokenHash, userRow.id, expiresAt]
    );

    // Set secure HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS,
      path: "/",
    });

    const user = {
      id: userRow.id,
      email: userRow.email,
      createdAt: userRow.created_at,
    };
    const profile = formatProfile(profileResult.rows[0]);

    res.json({ user, profile });
  } catch (err: any) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// 5. Logout
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  const cookieToken = req.cookies[SESSION_COOKIE_NAME];
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
  const rawToken = cookieToken || bearerToken;

  if (rawToken && isDbConfigured()) {
    try {
      const tokenHash = hashSessionToken(rawToken);
      await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    } catch (err: any) {
      console.error("Logout session deletion error:", err.message);
    }
  }

  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  res.json({ message: "Logged out successfully" });
});

// 6. Get Current Authenticated User & Profile (/api/auth/me)
app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const profileRes = await query("SELECT * FROM profiles WHERE user_id = $1", [req.user!.id]);
    if (profileRes.rows.length === 0) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }

    res.json({
      user: req.user,
      profile: formatProfile(profileRes.rows[0]),
    });
  } catch (err: any) {
    console.error("Error in /api/auth/me:", err.message);
    res.status(500).json({ error: "Failed to retrieve authenticated user." });
  }
});

// 7. Change Password
app.post("/api/auth/change-password", changePasswordLimiter, authenticateToken, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({ error: "All password fields are required." });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: "New password and confirmation do not match." });
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 128) {
    res.status(400).json({ error: "New password must be between 6 and 128 characters." });
    return;
  }

  if (newPassword === currentPassword) {
    res.status(400).json({ error: "New password must be different from current password." });
    return;
  }

  try {
    const userRes = await query("SELECT * FROM users WHERE id = $1", [req.user!.id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const userRow = userRes.rows[0];
    const { valid } = await verifyPassword(currentPassword, userRow.password_hash, userRow.password_salt);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }

    const { hash, salt } = await hashPassword(newPassword);

    // Update password and invalidate all existing sessions within a transaction
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3",
        [hash, salt, req.user!.id]
      );
      await client.query("DELETE FROM sessions WHERE user_id = $1", [req.user!.id]);
    });

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    });

    res.json({ message: "Password updated successfully! Please log in again with your new password." });
  } catch (err: any) {
    console.error("Change password error:", err.message);
    res.status(500).json({ error: "Failed to update password." });
  }
});

// 8. Get Profile
app.get("/api/profile", authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM profiles WHERE user_id = $1", [req.user!.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }
    res.json(formatProfile(result.rows[0]));
  } catch (err: any) {
    console.error("Error fetching profile:", err.message);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// 9. Update Profile
app.put("/api/profile", authenticateToken, async (req: Request, res: Response) => {
  const { displayName, bio, profileImage, capital, currency, username } = req.body || {};

  try {
    const existing = await query("SELECT * FROM profiles WHERE user_id = $1", [req.user!.id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }
    const currentProfile = existing.rows[0];

    let newUsername = currentProfile.username;
    let newNormalizedUsername = currentProfile.normalized_username;

    if (username !== undefined && typeof username === "string") {
      const cleanUsername = username.trim();
      if (!/^[a-zA-Z0-9_-]{3,40}$/.test(cleanUsername)) {
        res.status(400).json({
          error: "Username must be 3 to 40 characters containing letters, numbers, hyphens, or underscores.",
        });
        return;
      }
      const norm = cleanUsername.toLowerCase();
      if (norm !== currentProfile.normalized_username) {
        const check = await query(
          "SELECT user_id FROM profiles WHERE normalized_username = $1 AND user_id != $2",
          [norm, req.user!.id]
        );
        if (check.rows.length > 0) {
          res.status(400).json({ error: "This committee username is already taken." });
          return;
        }
        newUsername = cleanUsername;
        newNormalizedUsername = norm;
      }
    }

    const newDisplayName =
      displayName !== undefined && typeof displayName === "string"
        ? displayName.trim().slice(0, 100)
        : currentProfile.display_name;

    const newBio =
      bio !== undefined && typeof bio === "string"
        ? bio.trim().slice(0, 500)
        : currentProfile.bio;

    const newProfileImage =
      profileImage !== undefined && typeof profileImage === "string"
        ? profileImage.trim().slice(0, 200000)
        : currentProfile.profile_image;

    let newCapital = parseFloat(currentProfile.capital);
    if (capital !== undefined) {
      const num = typeof capital === "number" ? capital : parseFloat(capital);
      if (!isNaN(num) && num >= 0) {
        newCapital = Math.min(num, 1000000000);
      }
    }

    const newCurrency =
      currency !== undefined && typeof currency === "string"
        ? currency.trim().slice(0, 10)
        : currentProfile.currency;

    const updateRes = await query(
      `UPDATE profiles
       SET username = $1,
           normalized_username = $2,
           display_name = $3,
           bio = $4,
           profile_image = $5,
           capital = $6,
           currency = $7,
           updated_at = NOW()
       WHERE user_id = $8
       RETURNING *`,
      [
        newUsername,
        newNormalizedUsername,
        newDisplayName,
        newBio,
        newProfileImage,
        newCapital,
        newCurrency,
        req.user!.id,
      ]
    );

    res.json(formatProfile(updateRes.rows[0]));
  } catch (err: any) {
    console.error("Error updating profile:", err.message);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// 10. Get Expenses for Authenticated User
app.get("/api/expenses", authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, user_id, title, amount, category, date, notes, expense_order, created_at, updated_at
       FROM expenses
       WHERE user_id = $1
       ORDER BY expense_order ASC, created_at ASC`,
      [req.user!.id]
    );

    const expenses = result.rows.map(formatExpense);
    res.json(expenses);
  } catch (err: any) {
    console.error("Error fetching expenses:", err.message);
    res.status(500).json({ error: "Failed to fetch expenses." });
  }
});

// 11. Create Expense
app.post("/api/expenses", authenticateToken, async (req: Request, res: Response) => {
  const { title, amount, category, date, notes } = req.body || {};

  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle || cleanTitle.length > 200) {
    res.status(400).json({ error: "Expense description is required (maximum 200 characters)." });
    return;
  }

  const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000000) {
    res.status(400).json({ error: "Please enter a valid positive expense amount." });
    return;
  }

  const cleanCategory =
    typeof category === "string" && category.trim().length > 0
      ? category.trim().slice(0, 100)
      : "Miscellaneous";

  const cleanDate =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)
      ? date.slice(0, 10)
      : new Date().toISOString().split("T")[0];

  const cleanNotes = typeof notes === "string" ? notes.trim().slice(0, 1000) : "";

  try {
    const newExpense = await withTransaction(async (client) => {
      // Find the next available order index for this user
      const maxRes = await client.query(
        "SELECT COALESCE(MAX(expense_order), -1) AS max_order FROM expenses WHERE user_id = $1",
        [req.user!.id]
      );
      const nextOrder = Number(maxRes.rows[0].max_order) + 1;
      const expenseId = `exp_${crypto.randomUUID()}`;

      const insertRes = await client.query(
        `INSERT INTO expenses (id, user_id, title, amount, category, date, notes, expense_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, user_id, title, amount, category, date, notes, expense_order, created_at, updated_at`,
        [
          expenseId,
          req.user!.id,
          cleanTitle,
          numAmount,
          cleanCategory,
          cleanDate,
          cleanNotes,
          nextOrder,
        ]
      );

      return formatExpense(insertRes.rows[0]);
    });

    res.status(201).json(newExpense);
  } catch (err: any) {
    console.error("Error creating expense:", err.message);
    res.status(500).json({ error: "Failed to create expense record." });
  }
});

// 12. Reorder Expenses (MUST be defined before /api/expenses/:id to avoid parameter shadowing)
app.put("/api/expenses/reorder", authenticateToken, async (req: Request, res: Response) => {
  const { orderedIds } = req.body || {};

  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: "orderedIds must be an array of expense IDs." });
    return;
  }

  // Prevent duplicate IDs in the reorder request
  const uniqueIds = new Set(orderedIds);
  if (uniqueIds.size !== orderedIds.length) {
    res.status(400).json({ error: "Duplicate expense IDs in reorder request." });
    return;
  }

  try {
    const updatedExpenses = await withTransaction(async (client) => {
      // Retrieve all existing expense IDs belonging to this user
      const userExpensesRes = await client.query(
        "SELECT id FROM expenses WHERE user_id = $1",
        [req.user!.id]
      );
      const userExpenseIds = new Set(userExpensesRes.rows.map((r) => r.id));

      // Verify every ID in orderedIds belongs to the authenticated user
      for (const id of orderedIds) {
        if (!userExpenseIds.has(id)) {
          throw {
            status: 403,
            message: "Unauthorized: You attempted to reorder an expense that does not belong to you.",
          };
        }
      }

      // Verify that all user expenses are present in the reorder request
      if (orderedIds.length !== userExpenseIds.size) {
        throw {
          status: 400,
          message: "Reorder list must contain all user expenses.",
        };
      }

      // Update the expense_order for each record
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          "UPDATE expenses SET expense_order = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
          [i, orderedIds[i], req.user!.id]
        );
      }

      // Fetch and return the updated expenses in deterministic order
      const finalRes = await client.query(
        `SELECT id, user_id, title, amount, category, date, notes, expense_order, created_at, updated_at
         FROM expenses
         WHERE user_id = $1
         ORDER BY expense_order ASC, created_at ASC`,
        [req.user!.id]
      );

      return finalRes.rows.map(formatExpense);
    });

    res.json(updatedExpenses);
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Reorder expenses error:", err.message);
      res.status(500).json({ error: "Failed to persist reordered expenses." });
    }
  }
});

// 13. Update Single Expense
app.put("/api/expenses/:id", authenticateToken, async (req: Request, res: Response) => {
  const expenseId = req.params.id;
  const { title, amount, category, date, notes } = req.body || {};

  try {
    const existingRes = await query(
      "SELECT * FROM expenses WHERE id = $1 AND user_id = $2",
      [expenseId, req.user!.id]
    );

    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: "Expense not found." });
      return;
    }

    const currentExpense = existingRes.rows[0];

    const cleanTitle =
      title !== undefined && typeof title === "string"
        ? title.trim().slice(0, 200)
        : currentExpense.title;
    if (!cleanTitle) {
      res.status(400).json({ error: "Expense description cannot be empty." });
      return;
    }

    let numAmount = parseFloat(currentExpense.amount);
    if (amount !== undefined) {
      const parsed = typeof amount === "number" ? amount : parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0 || parsed > 1000000000) {
        res.status(400).json({ error: "Please enter a valid positive expense amount." });
        return;
      }
      numAmount = parsed;
    }

    const cleanCategory =
      category !== undefined && typeof category === "string"
        ? category.trim().slice(0, 100)
        : currentExpense.category;

    const cleanDate =
      date !== undefined && typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)
        ? date.slice(0, 10)
        : currentExpense.date;

    const cleanNotes =
      notes !== undefined && typeof notes === "string"
        ? notes.trim().slice(0, 1000)
        : currentExpense.notes;

    const updateRes = await query(
      `UPDATE expenses
       SET title = $1,
           amount = $2,
           category = $3,
           date = $4,
           notes = $5,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, title, amount, category, date, notes, expense_order, created_at, updated_at`,
      [cleanTitle, numAmount, cleanCategory, cleanDate, cleanNotes, expenseId, req.user!.id]
    );

    res.json(formatExpense(updateRes.rows[0]));
  } catch (err: any) {
    console.error("Error updating expense:", err.message);
    res.status(500).json({ error: "Failed to update expense." });
  }
});

// 14. Delete Expense
app.delete("/api/expenses/:id", authenticateToken, async (req: Request, res: Response) => {
  const expenseId = req.params.id;

  try {
    const deleted = await withTransaction(async (client) => {
      const deleteRes = await client.query(
        "DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id",
        [expenseId, req.user!.id]
      );

      if (deleteRes.rows.length === 0) {
        return false;
      }

      // Re-index remaining user expenses to keep consecutive expense_order values
      const remainingRes = await client.query(
        "SELECT id FROM expenses WHERE user_id = $1 ORDER BY expense_order ASC, created_at ASC",
        [req.user!.id]
      );

      for (let i = 0; i < remainingRes.rows.length; i++) {
        await client.query(
          "UPDATE expenses SET expense_order = $1 WHERE id = $2 AND user_id = $3",
          [i, remainingRes.rows[i].id, req.user!.id]
        );
      }

      return true;
    });

    if (!deleted) {
      res.status(404).json({ error: "Expense not found." });
      return;
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting expense:", err.message);
    res.status(500).json({ error: "Failed to delete expense." });
  }
});

// 15. Public Committee Ledger Endpoint (Clean & Strict Security)
app.get("/api/public/committee/:username", async (req: Request, res: Response) => {
  if (!isDbConfigured()) {
    res.status(503).json({ error: "Database not configured." });
    return;
  }

  const rawUsername = req.params.username;
  if (!rawUsername || typeof rawUsername !== "string") {
    res.status(400).json({ error: "Invalid committee username." });
    return;
  }

  const normalized = rawUsername.trim().toLowerCase();

  try {
    // 1. Fetch profile by normalized username
    const profileRes = await query(
      `SELECT user_id, username, display_name, bio, profile_image, capital, currency, updated_at
       FROM profiles
       WHERE normalized_username = $1`,
      [normalized]
    );

    if (profileRes.rows.length === 0) {
      res.status(404).json({ error: "Committee not found." });
      return;
    }

    const p = profileRes.rows[0];
    const capital = parseFloat(p.capital);
    const currency = p.currency || "₹";

    // 2. Fetch public expenses in deterministic persisted order
    // (Only safe public fields: id, title, amount, category, date, notes, order)
    const expensesRes = await query(
      `SELECT id, title, amount, category, date, notes, expense_order
       FROM expenses
       WHERE user_id = $1
       ORDER BY expense_order ASC, created_at ASC`,
      [p.user_id]
    );

    const publicExpenses = expensesRes.rows.map((row) => {
      let formattedDate: string;
      if (row.date instanceof Date) {
        formattedDate = row.date.toISOString().split("T")[0];
      } else if (typeof row.date === "string") {
        formattedDate = row.date.split("T")[0];
      } else {
        formattedDate = new Date().toISOString().split("T")[0];
      }

      return {
        id: row.id,
        title: row.title,
        amount: parseFloat(row.amount),
        category: row.category,
        date: formattedDate,
        notes: row.notes || "",
        order: Number(row.expense_order ?? 0),
      };
    });

    // 3. Compute ledger summaries
    const totalExpensesCount = publicExpenses.length;
    const totalSpent = publicExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = capital - totalSpent;
    const percentSpent = capital > 0 ? Math.round((totalSpent / capital) * 100) : 0;

    // Strict output without any secrets, emails, or internal hashes
    res.json({
      profile: {
        username: p.username,
        displayName: p.display_name || p.username,
        bio: p.bio || "",
        profileImage: p.profile_image || "",
        capital,
        currency,
        updatedAt: p.updated_at,
      },
      expenses: publicExpenses,
      summary: {
        totalExpensesCount,
        capital,
        totalSpent,
        remainingBudget,
        percentSpent,
      },
    });
  } catch (err: any) {
    console.error("Error fetching public committee profile:", err.message);
    res.status(500).json({ error: "Failed to retrieve committee ledger." });
  }
});

// ----------------------------------------------------
// FRONTEND SERVING & SERVER START
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, async () => {
    console.log(`Bappa Transaction Tracker server running on http://${HOST}:${PORT}`);
    if (isDbConfigured()) {
      console.log("PostgreSQL Database connected via DATABASE_URL.");
      try {
        await ensureSchema();
      } catch (err: any) {
        console.error("Initial schema setup error:", err.message);
      }
    } else {
      console.warn("DATABASE_URL is not set. Set DATABASE_URL in environment to enable database operations.");
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

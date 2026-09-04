import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "5mb" }));

// --- PERSISTENT STORAGE SETUP ---
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

interface Profile {
  userId: string;
  username: string; // e.g., "SBVMB Youth"
  normalizedUsername: string; // lowercase trimmed "sbvmb youth"
  displayName: string;
  bio: string;
  profileImage: string;
  capital: number;
  currency: string;
  updatedAt: string;
}

export interface Expense {
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

interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
}

interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  expenses: Expense[];
  sessions: Session[];
}

// In-memory state backed by disk
let db: DatabaseSchema = {
  users: [],
  profiles: [],
  expenses: [],
  sessions: []
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDatabase() {
  ensureDataDir();
  if (fs.existsSync(STORE_FILE)) {
  try {
    const data = fs.readFileSync(STORE_FILE, "utf-8");
    db = JSON.parse(data);
    console.log(
      `Database loaded: ${db.users.length} users, ${db.profiles.length} profiles, ${db.expenses.length} expenses.`
    );
    return;
  } catch (err) {
    console.error("Failed to parse store.json, initializing empty database:", err);
  }
}

console.log("No database found. Starting with an empty database.");
saveDatabase();
}

function saveDatabase() {
  ensureDataDir();
  try {
    const tempFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tempFile, STORE_FILE);
  } catch (err) {
    console.error("Failed to save database:", err);
  }
}

// Password hashing with Node's crypto
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, "sha512").toString("hex");
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return computedHash === hash;
}

  db.profiles.push({
    userId: user1Id,
    username: "SBVMB Youth",
    normalizedUsername: "sbvmb youth",
    displayName: "SBVMB Youth Ganesh Utsav Committee",
    bio: "Grand 11-Day Vinayaka Chavithi celebrations at Main Bazar. Join us for daily grand aarti, cultural events & laddoo auction.",
    profileImage: "https://images.unsplash.com/photo-1567591414240-e14f6b1eefb5?w=400&auto=format&fit=crop&q=80",
    capital: 125000,
    currency: "₹",
    updatedAt: new Date().toISOString()
  });

  const sampleExpenses = [
    { title: "Clay Vinayaka Idol (14 ft Eco-Friendly)", amount: 38000, category: "Idol / Pratima", notes: "Booked from Dhoolpet artisans with water-soluble colors", order: 0 },
    { title: "Grand Pandal, Stage & Water-proof Shedding", amount: 28500, category: "Decoration & Tent / Pandal", notes: "11 days pandal setup with floral arch entrance", order: 1 },
    { title: "Sound System, Speakers & Focus Lighting", amount: 16000, category: "Sound & Lighting", notes: "Daily evening aarti music & announcements", order: 2 },
    { title: "Daily Pooja Flowers, Garlands & Priest Dakshina", amount: 9500, category: "Puja & Priest", notes: "Veda pandits daily morning & evening puja rituals", order: 3 },
    { title: "Modaks & Maha Prasadam Distribution (Day 1-5)", amount: 14200, category: "Prasadam & Food", notes: "5000 packets prasadam for devotees", order: 4 },
    { title: "Police Permission, Fire Safety & Generator Backup", amount: 5800, category: "Permissions & Security", notes: "Official clearances and 15kVA generator", order: 5 }
  ];

  sampleExpenses.forEach((exp, idx) => {
    db.expenses.push({
      id: `exp_sbvmb_${idx + 1}`,
      userId: user1Id,
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: "2026-09-01",
      notes: exp.notes,
      order: exp.order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

// Authentication Middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }

  const session = db.sessions.find(s => s.token === token);
  if (!session || session.expiresAt < Date.now()) {
    res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    return;
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: "User associated with session not found." });
    return;
  }

  (req as any).user = user;
  next();
}

// --- API ROUTES ---

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Auth: Sign Up
app.post("/api/auth/signup", (req, res) => {
  const { email, password, username, displayName, bio, capital } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email address is required." });
    return;
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters long." });
    return;
  }

  if (!username || typeof username !== "string" || !username.trim()) {
    res.status(400).json({ error: "Committee username is required." });
    return;
  }

  const trimmedUsername = username.trim();
  const normalizedUsername = trimmedUsername.toLowerCase();

  // Validate username format (letters, digits, spaces, hyphens, underscores)
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedUsername) || trimmedUsername.length > 50) {
    res.status(400).json({ error: "Username can only contain letters, numbers, spaces, hyphens and underscores (max 50 chars)." });
    return;
  }

  // Check unique email
  if (db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    res.status(400).json({ error: "An account with this email already exists. Please log in." });
    return;
  }

  // Check unique username (case-insensitive)
  if (db.profiles.some(p => p.normalizedUsername === normalizedUsername)) {
    res.status(400).json({ error: `The committee name / username "${trimmedUsername}" is already taken. Please choose another.` });
    return;
  }

  // Create User
  const userId = `user_${crypto.randomUUID()}`;
  const { hash, salt } = hashPassword(password);
  const newUser: User = {
    id: userId,
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);

  // Create Profile
  const initialCapital = typeof capital === "number" && capital >= 0 ? capital : 50000;
  const newProfile: Profile = {
    userId,
    username: trimmedUsername,
    normalizedUsername,
    displayName: (displayName && typeof displayName === "string" && displayName.trim()) || trimmedUsername,
    bio: (bio && typeof bio === "string") ? bio.trim() : "Vinayaka Chavithi celebration committee finances and expense records.",
    profileImage: "https://images.unsplash.com/photo-1567591414240-e14f6b1eefb5?w=400&auto=format&fit=crop&q=80",
    capital: initialCapital,
    currency: "₹",
    updatedAt: new Date().toISOString()
  };
  db.profiles.push(newProfile);

  // Create Session Token
  const token = crypto.randomBytes(32).toString("hex");
  const session: Session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  db.sessions.push(session);

  saveDatabase();

  res.status(201).json({
    token,
    user: { id: newUser.id, email: newUser.email },
    profile: newProfile
  });
});

// Auth: Login
app.post("/api/auth/login", (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: "Please enter your email/username and password." });
    return;
  }

  const cleanIdent = String(identifier).trim().toLowerCase();

  // Find user by email or by profile username
  let targetUser = db.users.find(u => u.email.toLowerCase() === cleanIdent);
  if (!targetUser) {
    const profile = db.profiles.find(p => p.normalizedUsername === cleanIdent);
    if (profile) {
      targetUser = db.users.find(u => u.id === profile.userId);
    }
  }

  if (!targetUser) {
    res.status(401).json({ error: "Invalid credentials. No user found with that email or username." });
    return;
  }

  const valid = verifyPassword(password, targetUser.passwordHash, targetUser.passwordSalt);
  if (!valid) {
    res.status(401).json({ error: "Incorrect password. Please try again." });
    return;
  }

  const profile = db.profiles.find(p => p.userId === targetUser!.id);

  // Create Session Token
  const token = crypto.randomBytes(32).toString("hex");
  const session: Session = {
    token,
    userId: targetUser.id,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  db.sessions.push(session);

  saveDatabase();

  res.json({
    token,
    user: { id: targetUser.id, email: targetUser.email },
    profile: profile || null
  });
});

// Auth: Me
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const profile = db.profiles.find(p => p.userId === user.id);
  res.json({
    user: { id: user.id, email: user.email },
    profile: profile || null
  });
});

// Auth: Logout
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (token) {
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDatabase();
  }
  res.json({ success: true });
});

// --- PROFILE MANAGEMENT (PRIVATE - USER CAN ONLY EDIT OWN PROFILE) ---
app.put("/api/profile", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const profileIndex = db.profiles.findIndex(p => p.userId === user.id);

  if (profileIndex === -1) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }

  const currentProfile = db.profiles[profileIndex];
  const { username, displayName, bio, profileImage, capital, currency } = req.body;

  // If username is changing, ensure uniqueness
  if (username && typeof username === "string") {
    const trimmedUsername = username.trim();
    const normalized = trimmedUsername.toLowerCase();
    if (!trimmedUsername) {
      res.status(400).json({ error: "Username cannot be empty." });
      return;
    }

    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedUsername) || trimmedUsername.length > 50) {
      res.status(400).json({ error: "Username can only contain letters, numbers, spaces, hyphens and underscores." });
      return;
    }

    if (normalized !== currentProfile.normalizedUsername) {
      const exists = db.profiles.some(p => p.userId !== user.id && p.normalizedUsername === normalized);
      if (exists) {
        res.status(400).json({ error: `Username "${trimmedUsername}" is already taken by another committee.` });
        return;
      }
      currentProfile.username = trimmedUsername;
      currentProfile.normalizedUsername = normalized;
    }
  }

  if (displayName !== undefined && typeof displayName === "string") {
    currentProfile.displayName = displayName.trim() || currentProfile.username;
  }

  if (bio !== undefined && typeof bio === "string") {
    currentProfile.bio = bio.trim();
  }

  if (profileImage !== undefined && typeof profileImage === "string") {
    currentProfile.profileImage = profileImage.trim();
  }

  if (capital !== undefined) {
    const capNum = Number(capital);
    if (isNaN(capNum) || capNum < 0) {
      res.status(400).json({ error: "Capital budget must be a positive number." });
      return;
    }
    currentProfile.capital = capNum;
  }

  if (currency !== undefined && typeof currency === "string") {
    currentProfile.currency = currency.trim() || "₹";
  }

  currentProfile.updatedAt = new Date().toISOString();
  db.profiles[profileIndex] = currentProfile;
  saveDatabase();

  res.json({ profile: currentProfile });
});

// --- EXPENSES MANAGEMENT (PRIVATE - STRICT OWNERSHIP ENFORCED) ---

// Get all expenses for logged-in user (in user-defined order)
app.get("/api/expenses", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const userExpenses = db.expenses
    .filter(e => e.userId === user.id)
    .sort((a, b) => a.order - b.order);
  res.json(userExpenses);
});

// Add an expense
app.post("/api/expenses", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const { title, amount, category, date, notes } = req.body;

  // Check 90 expenses limit rule
  const currentCount = db.expenses.filter(e => e.userId === user.id).length;
  if (currentCount >= 90) {
    res.status(400).json({ error: "Maximum limit reached: You cannot add more than 90 expenses per profile." });
    return;
  }

  // Validate title: Empty expense titles should not be accepted
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Expense title cannot be empty." });
    return;
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: "Expense amount must be greater than 0." });
    return;
  }

  // Calculate order (append to end)
  const maxOrder = db.expenses
    .filter(e => e.userId === user.id)
    .reduce((max, exp) => Math.max(max, exp.order), -1);

  const newExpense: Expense = {
    id: `exp_${crypto.randomUUID()}`,
    userId: user.id,
    title: title.trim(),
    amount: Math.round(parsedAmount * 100) / 100,
    category: (category && typeof category === "string" && category.trim()) || "Miscellaneous",
    date: (date && typeof date === "string" && date.trim()) || new Date().toISOString().split("T")[0],
    notes: (notes && typeof notes === "string") ? notes.trim() : "",
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.expenses.push(newExpense);
  saveDatabase();

  res.status(201).json(newExpense);
});

// Edit an expense (User can ONLY edit their own expense)
app.put("/api/expenses/:id", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { title, amount, category, date, notes } = req.body;

  const expenseIndex = db.expenses.findIndex(e => e.id === id);
  if (expenseIndex === -1) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }

  const existingExpense = db.expenses[expenseIndex];

  // STRICT OWNERSHIP CHECK: User A must never be able to modify User B's information
  if (existingExpense.userId !== user.id) {
    res.status(403).json({ error: "Unauthorized: You do not own this expense." });
    return;
  }

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Expense title cannot be empty." });
      return;
    }
    existingExpense.title = title.trim();
  }

  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: "Expense amount must be greater than 0." });
      return;
    }
    existingExpense.amount = Math.round(parsedAmount * 100) / 100;
  }

  if (category !== undefined && typeof category === "string") {
    existingExpense.category = category.trim() || "Miscellaneous";
  }

  if (date !== undefined && typeof date === "string") {
    existingExpense.date = date.trim();
  }

  if (notes !== undefined && typeof notes === "string") {
    existingExpense.notes = notes.trim();
  }

  existingExpense.updatedAt = new Date().toISOString();
  db.expenses[expenseIndex] = existingExpense;
  saveDatabase();

  res.json(existingExpense);
});

// Delete an expense (User can ONLY delete their own expense)
app.delete("/api/expenses/:id", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const expense = db.expenses.find(e => e.id === id);
  if (!expense) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }

  // STRICT OWNERSHIP CHECK
  if (expense.userId !== user.id) {
    res.status(403).json({ error: "Unauthorized: You do not own this expense." });
    return;
  }

  db.expenses = db.expenses.filter(e => e.id !== id);
  saveDatabase();

  res.json({ success: true, message: "Expense deleted successfully." });
});

// Reorder expenses (User can ONLY reorder their own expenses)
app.put("/api/expenses/reorder", authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: "orderedIds must be an array of expense IDs." });
    return;
  }

  // Verify all IDs belong to this user
  const userExpenseIds = new Set(db.expenses.filter(e => e.userId === user.id).map(e => e.id));
  for (const id of orderedIds) {
    if (!userExpenseIds.has(id)) {
      res.status(403).json({ error: "Unauthorized: You attempted to reorder an expense that does not belong to you." });
      return;
    }
  }

  // Update orders
  orderedIds.forEach((id, index) => {
    const exp = db.expenses.find(e => e.id === id);
    if (exp && exp.userId === user.id) {
      exp.order = index;
      exp.updatedAt = new Date().toISOString();
    }
  });

  saveDatabase();

  const updatedExpenses = db.expenses
    .filter(e => e.userId === user.id)
    .sort((a, b) => a.order - b.order);

  res.json(updatedExpenses);
});

// --- PUBLIC ROUTES (ANYONE CAN VIEW WITHOUT LOGGING IN) ---

// Public Profile: Fetch committee details and ordered expenses by username (case-insensitive)
app.get("/api/public/committee/:username", (req, res) => {
  const rawParam = req.params.username;
  if (!rawParam) {
    res.status(400).json({ error: "Username is required." });
    return;
  }

  const decoded = decodeURIComponent(rawParam).trim();
  const normalized = decoded.toLowerCase();

  const profile = db.profiles.find(p => p.normalizedUsername === normalized);
  if (!profile) {
    res.status(404).json({
      error: `No committee found with the name "${decoded}".`,
      requestedUsername: decoded
    });
    return;
  }

  // Get expenses in leader-chosen order
  const expenses = db.expenses
    .filter(e => e.userId === profile.userId)
    .sort((a, b) => a.order - b.order)
    .map(e => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: e.date,
      notes: e.notes,
      order: e.order
    }));

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remainingBudget = profile.capital - totalSpent;

  res.json({
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      profileImage: profile.profileImage,
      capital: profile.capital,
      currency: profile.currency,
      updatedAt: profile.updatedAt
    },
    expenses,
    summary: {
      totalExpensesCount: expenses.length,
      capital: profile.capital,
      totalSpent,
      remainingBudget,
      percentSpent: profile.capital > 0 ? Math.min(100, Math.round((totalSpent / profile.capital) * 100)) : 0
    }
  });
});

// Public List: Suggest committees (e.g. for search / 404 page)
app.get("/api/public/committees", (_req, res) => {
  const list = db.profiles.map(p => ({
    username: p.username,
    displayName: p.displayName,
    bio: p.bio,
    profileImage: p.profileImage,
    capital: p.capital,
    expensesCount: db.expenses.filter(e => e.userId === p.userId).length
  }));
  res.json(list);
});

// --- VITE DEV & PROD SETUP ---
async function startServer() {
  loadDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ganesh Tracker Server running on http://localhost:${PORT}`);
  });
}

startServer();

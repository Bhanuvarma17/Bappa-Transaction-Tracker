import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let currentConnectionString: string | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required but not configured.");
  }

  if (!pool || currentConnectionString !== connectionString) {
    if (pool) {
      pool.end().catch((err) => {
        console.warn("Error closing old PostgreSQL pool:", err.message);
      });
    }

    currentConnectionString = connectionString;
    const isLocal =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err.message);
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  return p.query<T>(text, params);
}

export async function getClient(): Promise<pg.PoolClient> {
  const p = getPool();
  return p.connect();
}

/**
 * Executes a callback within a database transaction (BEGIN ... COMMIT ... ROLLBACK).
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

let schemaInitializedForUrl: string | null = null;

/**
 * Ensures all required PostgreSQL tables and indexes exist.
 * Runs automatically upon connecting to a database.
 */
export async function ensureSchema(): Promise<void> {
  if (!isDbConfigured()) return;
  const currentUrl = process.env.DATABASE_URL?.trim();
  if (schemaInitializedForUrl === currentUrl) return;

  await withTransaction(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        password_salt text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS profiles (
        user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        username text NOT NULL,
        normalized_username text UNIQUE NOT NULL,
        display_name text NOT NULL DEFAULT '',
        bio text NOT NULL DEFAULT '',
        profile_image text NOT NULL DEFAULT '',
        capital numeric(14,2) NOT NULL DEFAULT 50000,
        currency text NOT NULL DEFAULT '₹',
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        amount numeric(14,2) NOT NULL,
        category text NOT NULL DEFAULT 'Miscellaneous',
        date date NOT NULL DEFAULT current_date,
        notes text NOT NULL DEFAULT '',
        expense_order integer NOT NULL DEFAULT 0,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        expires_at timestamp with time zone NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_normalized_username ON profiles(normalized_username);
      CREATE INDEX IF NOT EXISTS idx_expenses_user_order ON expenses(user_id, expense_order ASC);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `);
  });

  schemaInitializedForUrl = currentUrl ?? null;
  console.log("PostgreSQL database tables and indexes verified successfully.");
}


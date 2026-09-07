import argon2 from "argon2";
import crypto from "crypto";

export const SESSION_COOKIE_NAME = "bappa_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hash a password using Argon2id.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
  return { hash, salt: "argon2id" };
}

/**
 * Verifies a password against the stored hash.
 * Supports Argon2id, with legacy fallback for PBKDF2 hashes from previous data migrations.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith("$argon2")) {
    try {
      const valid = await argon2.verify(storedHash, password);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy PBKDF2 check
  try {
    const computedHash = crypto
      .pbkdf2Sync(password, storedSalt, 1000, 64, "sha512")
      .toString("hex");
    const valid = computedHash === storedHash;
    return { valid, needsRehash: valid };
  } catch {
    return { valid: false, needsRehash: false };
  }
}

/**
 * Generates a cryptographically secure session token and returns both the raw token
 * and its SHA-256 hash.
 */
export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Computes SHA-256 hash of a raw session token.
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

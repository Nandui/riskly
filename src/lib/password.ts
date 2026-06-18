import bcrypt from "bcryptjs";

// Centralised password hashing. bcryptjs is pure-JS, so it runs fine on
// Vercel's serverless Node runtime (no native bindings to build).
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
function client() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    _sql = neon(url);
  }
  return _sql;
}

// Lazy tagged-template proxy so neon() is not constructed at import time.
export const sql = ((strings: TemplateStringsArray, ...vals: any[]) =>
  client()(strings, ...vals)) as NeonQueryFunction<false, false>;

export interface UserRow {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  is_admin: boolean;
  created_at: string;
}

/** Ensures the users table exists. Idempotent; safe to call on startup. */
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

// CLI: create an account and grant admin. Usage:
//   npm run admin:create -- <username> "<Display Name>" <password>
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Put it in .env (scripts load it via --env-file).");
  process.exit(1);
}
const [username, name, password] = process.argv.slice(2);
if (!username || !name || !password || password.length < 6) {
  console.error('Usage: npm run admin:create -- <username> "<Display Name>" <password 6+ chars>');
  process.exit(1);
}
const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
const hash = await bcrypt.hash(password, 12);
const rows = await sql`
  INSERT INTO users (username, name, password_hash, is_admin)
  VALUES (${username}, ${name}, ${hash}, true)
  ON CONFLICT (username) DO UPDATE SET password_hash = ${hash}, is_admin = true
  RETURNING username`;
console.log(`Admin ready: ${rows[0].username}`);
process.exit(0);

// CLI: reset a user's password. Usage: npm run users:reset -- <username> <newPassword>
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Put it in .env (scripts load it via --env-file).");
  process.exit(1);
}
const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 6) {
  console.error("Usage: npm run users:reset -- <username> <newPassword 6+ chars>");
  process.exit(1);
}
const sql = neon(url);
const hash = await bcrypt.hash(password, 12);
const rows =
  await sql`UPDATE users SET password_hash = ${hash} WHERE username = ${username} RETURNING username`;
if (!rows.length) console.error(`No user named "${username}".`);
else console.log(`Password reset for ${rows[0].username}.`);
process.exit(0);

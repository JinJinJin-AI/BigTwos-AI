// CLI: list all accounts. Usage: npm run users:list
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Put it in .env (scripts load it via --env-file).");
  process.exit(1);
}
const sql = neon(url);

const rows =
  await sql`SELECT username, name, is_admin, created_at FROM users ORDER BY created_at`;
if (!rows.length) {
  console.log("No accounts yet. Sign up at /signup (first user becomes admin).");
} else {
  console.table(
    rows.map((r) => ({
      username: r.username,
      name: r.name,
      admin: r.is_admin ? "yes" : "",
      created: new Date(r.created_at).toISOString().slice(0, 10)
    }))
  );
}
process.exit(0);

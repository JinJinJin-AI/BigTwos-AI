export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db/client";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, name, password } = await req.json();
  if (!username || !name || !password || password.length < 6) {
    return NextResponse.json({ error: "Invalid input. Password must be 6+ chars." }, { status: 400 });
  }
  await ensureSchema();
  const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (existing.length) return NextResponse.json({ error: "Username taken." }, { status: 409 });

  const count = await sql`SELECT COUNT(*)::int AS n FROM users`;
  const isAdmin = count[0].n === 0; // first user becomes admin
  const hash = await hashPassword(password);
  const rows =
    await sql`INSERT INTO users (username, name, password_hash, is_admin) VALUES (${username}, ${name}, ${hash}, ${isAdmin}) RETURNING id, username, name, is_admin`;
  const u = rows[0];
  await createSession({ uid: u.id, username: u.username, name: u.name, isAdmin: u.is_admin });
  return NextResponse.json({ ok: true });
}


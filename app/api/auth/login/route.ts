export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db/client";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  await ensureSchema();
  const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
  if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  const u = rows[0];
  await createSession({ uid: u.id, username: u.username, name: u.name, isAdmin: u.is_admin });
  return NextResponse.json({ ok: true });
}


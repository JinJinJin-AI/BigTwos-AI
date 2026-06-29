export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db/client";
import { getSession, hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const s = await getSession();
  if (!s?.isAdmin) return null;
  return s;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await ensureSchema();
  const rows = await sql`SELECT id, username, name, is_admin, created_at FROM users ORDER BY created_at`;
  return NextResponse.json({ users: rows });
}

// admin: change password or rename
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, name, password } = await req.json();
  if (name) await sql`UPDATE users SET name = ${name} WHERE id = ${id}`;
  if (password) await sql`UPDATE users SET password_hash = ${await hashPassword(password)} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}


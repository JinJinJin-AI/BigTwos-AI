import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sliding session: while a tab is open and active, re-issue a fresh 1h token so an
// ongoing game isn't interrupted by expiry. Returns 401 once the session is gone.
export async function POST() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  await createSession({ uid: s.uid, username: s.username, name: s.name, isAdmin: s.isAdmin });
  return NextResponse.json({ ok: true });
}

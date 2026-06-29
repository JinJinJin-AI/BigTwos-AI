"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), name: f.get("name"), password: f.get("password") })
    });
    if (res.ok) r.push("/game");
    else { setErr((await res.json()).error); setLoading(false); }
  }
  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", color: "#fff" }}>
      <h1>Sign up</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input name="name" placeholder="Display name" required />
        <input name="username" placeholder="Username" required />
        <input name="password" type="password" placeholder="Password (6+ chars)" required />
        <button disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
      </form>
      {err && <p style={{ color: "#ff6b6b" }}>{err}</p>}
      <p>Have an account? <Link href="/login">Login</Link></p>
    </main>
  );
}

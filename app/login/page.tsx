"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") })
    });
    if (res.ok) r.push("/game");
    else { setErr((await res.json()).error); setLoading(false); }
  }
  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", color: "#fff" }}>
      <h1>Login</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input name="username" placeholder="Username" required />
        <input name="password" type="password" placeholder="Password" required />
        <button disabled={loading}>{loading ? "Logging in…" : "Login"}</button>
      </form>
      {err && <p style={{ color: "#ff6b6b" }}>{err}</p>}
      <p>No account? <Link href="/signup">Sign up</Link></p>
    </main>
  );
}

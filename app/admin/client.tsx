"use client";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";

interface U { id: string; username: string; name: string; is_admin: boolean; }

export default function AdminClient() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = async () => { setLoading(true); setUsers((await (await fetch("/api/users")).json()).users || []); setLoading(false); };
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { setBusy(true); await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await load(); setBusy(false); };
  const patch = async (id: string, body: any) => { setBusy(true); await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); await load(); setBusy(false); };
  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", color: "#fff" }}>
      <h1>User Management</h1>
      {loading ? <Spinner label="Loading users…" /> : (
      <table style={{ width: "100%", opacity: busy ? 0.5 : 1 }}>
        <thead><tr><th>User</th><th>Name</th><th>Admin</th><th></th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td><td>{u.name}</td><td>{u.is_admin ? "✔" : ""}</td>
              <td>
                <button disabled={busy} onClick={() => { const p = prompt("New password"); if (p) patch(u.id, { password: p }); }}>Reset pw</button>
                <button disabled={busy} onClick={() => del(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </main>
  );
}

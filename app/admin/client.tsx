"use client";
import { useEffect, useState } from "react";

interface U { id: string; username: string; name: string; is_admin: boolean; }

export default function AdminClient() {
  const [users, setUsers] = useState<U[]>([]);
  const load = async () => setUsers((await (await fetch("/api/users")).json()).users || []);
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); };
  const patch = async (id: string, body: any) => { await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); load(); };
  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", color: "#fff" }}>
      <h1>User Management</h1>
      <table style={{ width: "100%" }}>
        <thead><tr><th>User</th><th>Name</th><th>Admin</th><th></th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td><td>{u.name}</td><td>{u.is_admin ? "✔" : ""}</td>
              <td>
                <button onClick={() => { const p = prompt("New password"); if (p) patch(u.id, { password: p }); }}>Reset pw</button>
                <button onClick={() => del(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  displayName: string | null;
  role: string;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<UserRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [roleFilter, setRoleFilter] = useState("team");

  const load = (role: string) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (role) p.set("role", role);
    fetch(`/api/admin/users?${p}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false); });
  };

  useEffect(() => { load("team"); }, []);

  const handleRoleFilter = (r: string) => {
    setRoleFilter(r);
    load(r);
  };

  const patch = async (u: UserRow, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users?id=${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  const toggleAdmin = async (u: UserRow) => {
    const action = u.isAdmin ? "Revoke admin from" : "Grant admin to";
    if (!confirm(`${action} "${u.displayName ?? u.id}"?`)) return;
    if (await patch(u, { isAdmin: !u.isAdmin }))
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, isAdmin: !u.isAdmin } : p));
  };

  const toggleRole = async (u: UserRow) => {
    const newRole = u.role === "team" ? "community" : "team";
    if (await patch(u, { role: newRole }))
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, role: newRole } : p));
  };

  const toggleBan = async (u: UserRow) => {
    const action = u.isBanned ? "Unban" : "Ban";
    if (!confirm(`${action} "${u.displayName ?? u.id}"?`)) return;
    if (await patch(u, { isBanned: !u.isBanned }))
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, isBanned: !u.isBanned } : p));
  };

  return (
    <div className="admin-page">
      <h1 className="admin-title">Users</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {(["team", "community", ""] as const).map(r => (
          <button key={r} className={`btn ${roleFilter === r ? "btn--primary" : "btn--ghost"}`}
            style={{ fontSize: "0.8rem", padding: "4px 14px" }}
            onClick={() => handleRoleFilter(r)}>
            {r === "" ? "All" : r === "team" ? "Team" : "Community"}
          </button>
        ))}
      </div>

      <div className="admin-card">
        {loading ? <p>Loading…</p> : users.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>No users found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Username</th><th>Role</th><th>Admin</th><th>Status</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={u.isBanned ? { opacity: 0.6 } : undefined}>
                    <td style={{ fontWeight: 600 }}>
                      {u.displayName ?? <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                    </td>
                    <td>
                      <button className="btn btn--ghost" style={{ fontSize: "0.75rem", padding: "2px 10px" }}
                        onClick={() => toggleRole(u)}>
                        {u.role}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 999, fontWeight: 700,
                        background: u.isAdmin ? "var(--color-primary)" : "var(--color-surface-2)",
                        color: u.isAdmin ? "#fff" : "var(--color-text-muted)" }}>
                        {u.isAdmin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td>
                      {u.isBanned && (
                        <span style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 999, fontWeight: 700,
                          background: "var(--color-danger)", color: "#fff" }}>
                          Banned
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button className="btn btn--ghost" style={{ fontSize: "0.75rem", padding: "2px 10px" }}
                        onClick={() => toggleAdmin(u)}>
                        {u.isAdmin ? "Revoke Admin" : "Grant Admin"}
                      </button>
                      <button className="btn" style={{ fontSize: "0.75rem", padding: "2px 10px",
                        color: u.isBanned ? "var(--color-primary)" : "var(--color-danger)",
                        borderColor: u.isBanned ? "var(--color-primary)" : "var(--color-danger)" }}
                        onClick={() => toggleBan(u)}>
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

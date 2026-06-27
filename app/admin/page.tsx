"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RatingRow {
  id: string;
  createdAt: string;
  entrance: string;
  walkwayDoorWidth: string;
  accessibleRestroom: string;
  tableSeating: string;
  parking: string;
  note: string | null;
  venue:   { name: string };
  profile: { displayName: string | null } | null;
}

interface VenueRow {
  id: string;
  name: string;
  address: string;
  category: string;
  _count: { ratings: number };
}

interface Stats {
  venueCount:    number;
  ratingCount:   number;
  userCount:     number;
  recentRatings: RatingRow[];
  topVenues:     VenueRow[];
}

function answerIcon(a: string) {
  if (a === "yes")    return { icon: "✓", color: "#1a7a1a" };
  if (a === "no")     return { icon: "✗", color: "#b00020" };
  return                     { icon: "?", color: "#8a6a00" };
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => {
        if (r.status === 403) { router.replace("/"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.error) { setError(d.error); setLoading(false); return; }
        setStats(d);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load dashboard."); setLoading(false); });
  }, [router]);

  if (loading) return (
    <main id="main-content" style={{ padding: "2rem" }}>
      <p>Loading admin dashboard…</p>
    </main>
  );

  if (error) return (
    <main id="main-content" style={{ padding: "2rem" }}>
      <p style={{ color: "var(--color-danger)" }}>{error}</p>
    </main>
  );

  if (!stats) return null;

  return (
    <main id="main-content" className="admin-page">
      <div className="container">
        <h1 className="admin-title">Admin Dashboard</h1>

        {/* Stat cards */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.venueCount}</span>
            <span className="admin-stat-label">Venues</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.ratingCount}</span>
            <span className="admin-stat-label">Total Ratings</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.userCount}</span>
            <span className="admin-stat-label">Users</span>
          </div>
        </div>

        <div className="admin-grid">

          {/* Recent ratings */}
          <section className="admin-card">
            <h2>Recent Ratings</h2>
            {stats.recentRatings.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>No ratings yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Venue</th>
                      <th>E</th><th>W</th><th>R</th><th>S</th><th>P</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentRatings.map((r) => (
                      <tr key={r.id}>
                        <td>{r.profile?.displayName ?? "—"}</td>
                        <td>{r.venue.name}</td>
                        {[r.entrance, r.walkwayDoorWidth, r.accessibleRestroom, r.tableSeating, r.parking].map((val, i) => {
                          const { icon, color } = answerIcon(val);
                          return <td key={i} style={{ color, fontWeight: 700, textAlign: "center" }}>{icon}</td>;
                        })}
                        <td style={{ whiteSpace: "nowrap", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Top venues by rating count */}
          <section className="admin-card">
            <h2>Venues by Ratings</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Ratings</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topVenues.map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{v.category}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{v._count.ratings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}

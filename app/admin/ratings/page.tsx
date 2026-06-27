"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  { key: "entrance",           label: "Entrance"  },
  { key: "walkwayDoorWidth",   label: "Walkway"   },
  { key: "accessibleRestroom", label: "Restroom"  },
  { key: "tableSeating",       label: "Seating"   },
  { key: "parking",            label: "Parking"   },
] as const;

type Answer = "yes" | "no" | "unsure" | "";

interface Rating {
  id: string; createdAt: string; raterType: string; verified: boolean;
  note: string | null; photoProofUrl: string | null;
  entrance: string; walkwayDoorWidth: string; accessibleRestroom: string;
  tableSeating: string; parking: string;
  venue: { name: string }; profile: { displayName: string | null } | null;
}
interface Venue { id: string; name: string; }

function icon(v: string) {
  if (v === "yes")    return { i: "✓", c: "#1a7a1a" };
  if (v === "no")     return { i: "✗", c: "#b00020" };
  return                     { i: "?", c: "#8a6a00"  };
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [venues,  setVenues]  = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterVenue,  setFilterVenue]  = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [showForm,     setShowForm]     = useState(false);
  const [formVenue,    setFormVenue]    = useState("");
  const [answers,      setAnswers]      = useState<Record<string, Answer>>({
    entrance: "", walkwayDoorWidth: "", accessibleRestroom: "", tableSeating: "", parking: "",
  });
  const [formNote,  setFormNote]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState("");

  const load = (venue = filterVenue, type = filterType) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (venue) p.set("venueId", venue);
    if (type)  p.set("raterType", type);
    fetch(`/api/admin/ratings?${p}`)
      .then(r => r.json())
      .then(d => { setRatings(d.ratings ?? []); setVenues(d.venues ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rating? This cannot be undone.")) return;
    await fetch(`/api/admin/ratings?id=${id}`, { method: "DELETE" });
    setRatings(prev => prev.filter(r => r.id !== id));
  };

  const handleVerify = async (id: string, verified: boolean) => {
    await fetch(`/api/admin/ratings?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified }),
    });
    setRatings(prev => prev.map(r => r.id === id ? { ...r, verified } : r));
  };

  const handleSubmitTeam = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    if (!formVenue) { setFormError("Select a venue."); return; }
    if (Object.values(answers).some(v => v === "")) { setFormError("Answer all 5 items."); return; }
    setSubmitting(true);
    const res = await fetch("/api/admin/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId: formVenue, ...answers, note: formNote }),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error); return; }
    setShowForm(false);
    setFormVenue(""); setFormNote(""); setFormError("");
    setAnswers({ entrance: "", walkwayDoorWidth: "", accessibleRestroom: "", tableSeating: "", parking: "" });
    load();
  };

  return (
    <div className="admin-page">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <h1 className="admin-title" style={{ margin: 0 }}>Ratings</h1>
        <button className="btn btn--primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? "Cancel" : "+ Add Team Rating"}
        </button>
      </div>

      {/* Team rating form */}
      {showForm && (
        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <h2>Submit Team Rating</h2>
          {formError && <p className="error-msg">{formError}</p>}
          <form onSubmit={handleSubmitTeam}>
            <div className="auth-form-grid" style={{ marginBottom: "1rem" }}>
              <div className="form-group auth-form-full">
                <label>Venue</label>
                <select className="input" value={formVenue} onChange={e => setFormVenue(e.target.value)}>
                  <option value="">— select venue —</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              {ITEMS.map(item => (
                <div key={item.key} className="form-group">
                  <label>{item.label}</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {(["yes","no","unsure"] as const).map(val => (
                      <label key={val} className={`answer-btn ${answers[item.key] === val ? "answer-btn--active" : ""}`}
                        style={answers[item.key] === val ? { borderColor: val === "yes" ? "#1a7a1a" : val === "no" ? "#b00020" : "#8a6a00", color: val === "yes" ? "#1a7a1a" : val === "no" ? "#b00020" : "#8a6a00" } : undefined}>
                        <input type="radio" className="sr-only" name={item.key} value={val}
                          checked={answers[item.key] === val}
                          onChange={() => setAnswers(p => ({ ...p, [item.key]: val }))} />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="form-group auth-form-full">
                <label>Note (optional)</label>
                <textarea className="input textarea" value={formNote} onChange={e => setFormNote(e.target.value)} rows={2} />
              </div>
            </div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit as Team"}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select className="input" style={{ maxWidth: 220 }} value={filterVenue}
          onChange={e => { setFilterVenue(e.target.value); load(e.target.value, filterType); }}>
          <option value="">All venues</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={filterType}
          onChange={e => { setFilterType(e.target.value); load(filterVenue, e.target.value); }}>
          <option value="">All types</option>
          <option value="team">Team</option>
          <option value="community">Community</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-card">
        {loading ? <p>Loading…</p> : ratings.length === 0 ? <p style={{ color: "var(--color-text-muted)" }}>No ratings found.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th><th>Venue</th><th>Type</th>
                  <th>E</th><th>W</th><th>R</th><th>S</th><th>P</th>
                  <th>Note</th><th>Photo</th><th>Verified</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(r => (
                  <tr key={r.id}>
                    <td>{r.profile?.displayName ?? "—"}</td>
                    <td>{r.venue.name}</td>
                    <td>
                      <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 999,
                        background: r.raterType === "team" ? "var(--color-primary)" : "var(--color-surface-2)",
                        color: r.raterType === "team" ? "#fff" : "inherit", fontWeight: 700 }}>
                        {r.raterType}
                      </span>
                    </td>
                    {[r.entrance, r.walkwayDoorWidth, r.accessibleRestroom, r.tableSeating, r.parking].map((v, i) => {
                      const { i: ic, c } = icon(v);
                      return <td key={i} style={{ color: c, fontWeight: 700, textAlign: "center" }}>{ic}</td>;
                    })}
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.note ?? "—"}
                    </td>
                    <td>
                      {r.photoProofUrl
                        ? <a href={r.photoProofUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "underline" }}>
                            View
                          </a>
                        : <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>—</span>
                      }
                    </td>
                    <td>
                      <button className="btn btn--ghost" style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                        onClick={() => handleVerify(r.id, !r.verified)}>
                        {r.verified ? "✓ Verified" : "Verify"}
                      </button>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn" style={{ fontSize: "0.75rem", padding: "2px 8px", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                        onClick={() => handleDelete(r.id)}>
                        Delete
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

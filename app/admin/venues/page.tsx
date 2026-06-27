"use client";

import { useEffect, useState } from "react";

interface Venue {
  id: string; name: string; address: string; category: string;
  lat: number; lng: number; photoUrl: string | null;
  googlePlaceId: string;
  _count: { ratings: number };
}

const EMPTY_FORM = { name: "", address: "", lat: "", lng: "", category: "restaurant", googlePlaceId: "", photoUrl: "" };

export default function AdminVenuesPage() {
  const [venues,  setVenues]  = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");

  const load = (q = search) => {
    setLoading(true);
    fetch(`/api/admin/venues${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      .then(r => r.json())
      .then(d => { setVenues(d.venues ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null); setForm(EMPTY_FORM); setFormError(""); setShowForm(true);
  };

  const openEdit = (v: Venue) => {
    setEditId(v.id);
    setForm({ name: v.name, address: v.address, lat: String(v.lat), lng: String(v.lng),
      category: v.category, googlePlaceId: v.googlePlaceId, photoUrl: v.photoUrl ?? "" });
    setFormError(""); setShowForm(true);
  };

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.address || !form.lat || !form.lng) {
      setFormError("Name, address, lat and lng are required."); return;
    }
    setSaving(true);
    const res = editId
      ? await fetch(`/api/admin/venues?id=${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/admin/venues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error); return; }
    setShowForm(false); load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This also deletes all its ratings.`)) return;
    await fetch(`/api/admin/venues?id=${id}`, { method: "DELETE" });
    setVenues(prev => prev.filter(v => v.id !== id));
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="admin-page">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <h1 className="admin-title" style={{ margin: 0 }}>Venues</h1>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Venue</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <h2>{editId ? "Edit Venue" : "Add Venue"}</h2>
          {formError && <p className="error-msg">{formError}</p>}
          <form onSubmit={handleSave}>
            <div className="auth-form-grid" style={{ marginBottom: "1rem" }}>
              <div className="form-group auth-form-full">
                <label>Name</label>
                <input className="input" value={form.name} onChange={f("name")} placeholder="e.g. Phúc Long – Sky Garden" />
              </div>
              <div className="form-group auth-form-full">
                <label>Address (from Google Maps)</label>
                <input className="input" value={form.address} onChange={f("address")} placeholder="Full address" />
              </div>
              <div className="form-group">
                <label>Latitude</label>
                <input className="input" value={form.lat} onChange={f("lat")} placeholder="10.7313" />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input className="input" value={form.lng} onChange={f("lng")} placeholder="106.7120" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="input" value={form.category} onChange={f("category")}>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                </select>
              </div>
              <div className="form-group">
                <label>Google Place ID <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span></label>
                <input className="input" value={form.googlePlaceId} onChange={f("googlePlaceId")} placeholder="ChIJ…" />
              </div>
              <div className="form-group auth-form-full">
                <label>Photo URL <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span></label>
                <input className="input" value={form.photoUrl} onChange={f("photoUrl")} placeholder="https://…" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input className="input" style={{ maxWidth: 300 }} placeholder="Search venues…" value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
      </div>

      {/* Table */}
      <div className="admin-card">
        {loading ? <p>Loading…</p> : venues.length === 0 ? <p style={{ color: "var(--color-text-muted)" }}>No venues found.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Category</th><th>Address</th><th style={{ textAlign: "right" }}>Ratings</th><th></th></tr>
              </thead>
              <tbody>
                {venues.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{v.category}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.address}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{v._count.ratings}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button className="btn btn--ghost" style={{ fontSize: "0.75rem", padding: "2px 10px" }} onClick={() => openEdit(v)}>Edit</button>
                        <button className="btn" style={{ fontSize: "0.75rem", padding: "2px 10px", color: "var(--color-danger)", borderColor: "var(--color-danger)" }} onClick={() => handleDelete(v.id, v.name)}>Delete</button>
                      </div>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { VenueData } from "@/components/VenueCard";
import ReviewModal from "@/components/ReviewModal";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  venue: VenueData;
  onClose: () => void;
  onRatingChanged?: () => void;
}

interface RatingItem {
  id: string;
  ratedBy: string;
  createdAt: string;
  raterType: string;
  entrance: string;
  walkwayDoorWidth: string;
  accessibleRestroom: string;
  tableSeating: string;
  parking: string;
  note: string | null;
  serviceRating: number | null;
  photoProofUrl: string | null;
  profile: { displayName: string | null; role: string } | null;
}

const CHECKLIST_LABELS: { key: keyof VenueData; label: string; detailKey: keyof RatingItem }[] = [
  { key: "entrancePct",  label: "Step-free entrance",    detailKey: "entrance"           },
  { key: "walkwayPct",   label: "Walkway / door width",  detailKey: "walkwayDoorWidth"   },
  { key: "restroomPct",  label: "Accessible restroom",   detailKey: "accessibleRestroom" },
  { key: "seatingPct",   label: "Accessible seating",    detailKey: "tableSeating"       },
  { key: "parkingPct",   label: "Accessible parking",    detailKey: "parking"            },
];

function pctColor(pct: number) {
  if (pct >= 75) return "var(--color-success)";
  if (pct >= 45) return "#8a6a00";
  return "var(--color-danger)";
}

function answerIcon(a: string) {
  if (a === "yes")  return { icon: "✓", color: "#1a7a1a" };
  if (a === "no")   return { icon: "✗", color: "#b00020" };
  return                   { icon: "?", color: "#8a6a00" };
}

export default function DetailModal({ venue, onClose, onRatingChanged }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [ratings, setRatings]     = useState<RatingItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<RatingItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRatings = () => {
    fetch(`/api/ratings?venueId=${venue.id}`)
      .then((r) => r.json())
      .then((d) => { setRatings(d.ratings ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => { loadRatings(); }, [venue.id]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const modal = document.getElementById("detail-modal");
    if (!modal) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const els = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'
      );
      const first = els[0]; const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    modal.addEventListener("keydown", trap);
    return () => modal.removeEventListener("keydown", trap);
  }, [onClose]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete your rating? This cannot be undone.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/ratings?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) { setRatings((prev) => prev.filter((r) => r.id !== id)); onRatingChanged?.(); }
  };

  const hasData = venue.totalRatings > 0;

  return (
    <>
      <div
        id="detail-modal"
        className="modal modal--open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="modal__panel" role="document">
          <h2 id="detail-title" className="modal__title" ref={titleRef} tabIndex={-1}>
            {venue.title}
          </h2>
          <p className="helper">{venue.address}</p>

          {/* Checklist summary */}
          <h3>Accessibility Checklist</h3>
          {hasData ? (
            <div className="ratings-grid" aria-label="Accessibility checklist results">
              {CHECKLIST_LABELS.map(({ key, label }) => {
                const pct = venue[key] as number;
                return (
                  <div key={key} className="rating-line" role="group" aria-label={`${label}: ${pct}% yes`}>
                    <span className="rating-label">{label}</span>
                    <span
                      className="progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                    >
                      <span className="progress__bar" style={{ width: `${pct}%`, background: pctColor(pct) }} />
                    </span>
                    <span className="rating-num" style={{ color: pctColor(pct), fontWeight: 700 }}>{pct}%</span>
                  </div>
                );
              })}
              <p className="helper" style={{ marginTop: 6 }}>
                Based on {venue.totalRatings} rating{venue.totalRatings !== 1 ? "s" : ""}.
                Percentage of raters who answered "Yes".
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>No ratings yet for this venue.</p>
          )}

          {/* Individual ratings */}
          <h3>
            Community Ratings
            {!loading && ratings.length > 0 && ` (${ratings.length})`}
          </h3>
          <div className="feedback-container">
            {loading ? (
              <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
            ) : ratings.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>No ratings yet. Be the first!</p>
            ) : (
              <ul className="rating-card-list">
                {ratings.map((r) => {
                  const name   = r.profile?.displayName ?? "Anonymous";
                  const isTeam = r.raterType === "team";
                  const isOwn  = currentUserId === r.ratedBy;
                  return (
                    <li key={r.id} className="rating-card">
                      {/* Header row */}
                      <div className="rating-card__header">
                        <div className="rating-card__meta">
                          <strong className="rating-card__name">{name}</strong>
                          {isTeam && <span className="rating-card__team-badge" aria-label="Rated by team member">✓ Team</span>}
                          <span className="rating-card__date">
                            {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        {isOwn && (
                          <div className="rating-card__actions">
                            <button type="button" className="btn btn--ghost"
                              style={{ fontSize: "0.75rem", padding: "2px 10px", minHeight: "unset" }}
                              onClick={() => setEditRating(r)}>
                              Edit
                            </button>
                            <button type="button" className="btn"
                              style={{ fontSize: "0.75rem", padding: "2px 10px", minHeight: "unset", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                              disabled={deletingId === r.id}
                              onClick={() => handleDelete(r.id)}>
                              {deletingId === r.id ? "…" : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Checklist answers */}
                      <div className="rating-card__answers">
                        {CHECKLIST_LABELS.map(({ label, detailKey }) => {
                          const val = r[detailKey] as string;
                          const { icon, color } = answerIcon(val);
                          return (
                            <span key={detailKey} className="rating-card__answer" style={{ color }}>
                              {icon} {label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Service rating */}
                      {r.serviceRating && (
                        <div style={{ fontSize: "0.85rem" }}>
                          <span style={{ color: "var(--color-text-muted)", marginRight: 4 }}>Service:</span>
                          {"★".repeat(r.serviceRating)}{"☆".repeat(5 - r.serviceRating)}
                        </div>
                      )}

                      {/* Note */}
                      {r.note && (
                        <p className="rating-card__note">&ldquo;{r.note}&rdquo;</p>
                      )}

                      {/* Photo */}
                      {r.photoProofUrl && (
                        <a href={r.photoProofUrl} target="_blank" rel="noopener noreferrer"
                          className="rating-card__photo-link">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.photoProofUrl} alt="Photo proof" className="rating-card__photo" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="actions">
            <a
              href={
                venue.lat && venue.lng
                  ? `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.title + " " + venue.address)}`
              }
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get directions to ${venue.title} in Google Maps`}
            >
              Get Directions
            </a>
            <button type="button" className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {editRating && (
        <ReviewModal
          venueId={venue.id}
          place={venue.title}
          onClose={() => setEditRating(null)}
          onSaved={() => { setEditRating(null); setLoading(true); loadRatings(); onRatingChanged?.(); }}
          editRating={{
            id:      editRating.id,
            answers: {
              entrance:           editRating.entrance,
              walkwayDoorWidth:   editRating.walkwayDoorWidth,
              accessibleRestroom: editRating.accessibleRestroom,
              tableSeating:       editRating.tableSeating,
              parking:            editRating.parking,
            },
            note:          editRating.note ?? "",
            serviceRating: editRating.serviceRating,
            photoProofUrl: editRating.photoProofUrl,
          }}
        />
      )}
    </>
  );
}

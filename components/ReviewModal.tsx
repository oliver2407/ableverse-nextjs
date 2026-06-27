"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface EditRating {
  id: string;
  answers: Record<string, string>;
  note: string;
  serviceRating?: number | null;
  photoProofUrl?: string | null;
}

interface Props {
  venueId: string;
  place: string;
  onClose: () => void;
  onSaved?: () => void;
  editRating?: EditRating;
}

const ITEMS = [
  { key: "entrance",           label: "Step-free entrance / ramp"                       },
  { key: "walkwayDoorWidth",   label: "Walkway & door wide enough for a wheelchair"      },
  { key: "accessibleRestroom", label: "Accessible restroom available"                    },
  { key: "tableSeating",       label: "Table with open space underneath (no fixed chair)"},
  { key: "parking",            label: "Accessible parking near entrance"                 },
] as const;

type Answer = "yes" | "no" | "unsure" | "";
type Answers = Record<string, Answer>;

const ANSWER_LABELS: { value: Exclude<Answer, "">; label: string; color: string }[] = [
  { value: "yes",    label: "Yes",    color: "#1a7a1a" },
  { value: "no",     label: "No",     color: "#b00020" },
  { value: "unsure", label: "Unsure", color: "#8a6a00" },
];

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ReviewModal({ venueId, place, onClose, onSaved, editRating }: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const isEdit   = !!editRating;

  const [answers, setAnswers] = useState<Answers>(() =>
    editRating
      ? { ...editRating.answers } as Answers
      : Object.fromEntries(ITEMS.map((i) => [i.key, "" as Answer]))
  );
  const [note,         setNote]         = useState(editRating?.note ?? "");
  const [serviceRating, setServiceRating] = useState<number>(editRating?.serviceRating ?? 0);
  const [photoFile,  setPhotoFile]  = useState<File | null>(null);
  const [preview,    setPreview]    = useState<string | null>(editRating?.photoProofUrl ?? null);
  const [keepPhoto,  setKeepPhoto]  = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Clean up local preview blob on unmount
  useEffect(() => {
    return () => { if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview); };
  }, [preview]);

  useEffect(() => {
    const modal = document.getElementById("review-modal");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only image files are allowed."); return; }
    if (file.size > MAX_BYTES) { setError("Image must be under 5 MB."); return; }
    setError("");
    setPhotoFile(file);
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setKeepPhoto(true);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setKeepPhoto(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const anyAnswered = ITEMS.some((i) => answers[i.key] !== "");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!anyAnswered) { setError("Please answer at least one item before submitting."); return; }

    const { data: { user } } = await createClient().auth.getUser();
    if (!user) { router.push("/sign-in"); return; }

    setSubmitting(true);

    // Upload new photo via server route (bypasses storage RLS)
    let photoProofUrl: string | null | undefined = undefined;
    if (photoFile) {
      const form = new FormData();
      form.append("file", photoFile);
      const uploadRes = await fetch("/api/upload-photo", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        setError(`Photo upload failed: ${d.error ?? uploadRes.statusText}`);
        setSubmitting(false);
        return;
      }
      const { url } = await uploadRes.json();
      photoProofUrl = url;
    } else if (isEdit && !keepPhoto) {
      photoProofUrl = null;
    }

    const resolve = (v: Answer) => v || "unsure";
    const payload: Record<string, unknown> = {
      entrance:           resolve(answers.entrance),
      walkwayDoorWidth:   resolve(answers.walkwayDoorWidth),
      accessibleRestroom: resolve(answers.accessibleRestroom),
      tableSeating:       resolve(answers.tableSeating),
      parking:            resolve(answers.parking),
      serviceRating:      serviceRating || null,
      note:               note.trim() || undefined,
      ...(photoProofUrl !== undefined && { photoProofUrl }),
    };

    const res = isEdit
      ? await fetch(`/api/ratings?id=${editRating!.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        })
      : await fetch("/api/ratings", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ venueId, ...payload }),
        });

    setSubmitting(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
    onSaved?.();
    const live = document.getElementById("sr-live");
    if (live) live.textContent = isEdit ? `Rating updated for ${place}.` : `Rating submitted for ${place}. Thank you!`;
  };

  return (
    <div
      id="review-modal"
      className="modal modal--open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal__panel" role="document">
        <h2 id="review-title" className="modal__title" ref={titleRef} tabIndex={-1}>
          {isEdit ? "Edit Your Rating" : "Rate Accessibility"}
        </h2>
        <p className="helper">
          <strong>{place}</strong> — answer what you personally observed.
          Skipped items are recorded as <em>unsure</em>.
        </p>

        {success ? (
          <div role="alert" style={{ padding: "1.5rem 0" }}>
            <p style={{ color: "var(--color-success)", fontWeight: 600, marginBottom: "1rem" }}>
              {isEdit ? "Your rating has been updated." : "Thank you! Your rating has been submitted."}
            </p>
            <button type="button" className="btn btn--primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <p className="error-msg" role="alert" aria-live="assertive">{error}</p>
            )}

            <div className="checklist">
              {ITEMS.map((item) => (
                <fieldset key={item.key} className="checklist__item">
                  <legend className="checklist__legend">{item.label}</legend>
                  <div className="checklist__options" role="group">
                    {ANSWER_LABELS.map(({ value, label, color }) => {
                      const checked = answers[item.key] === value;
                      return (
                        <label
                          key={value}
                          className={`answer-btn ${checked ? "answer-btn--active" : ""}`}
                          style={checked ? { borderColor: color, color } : undefined}
                        >
                          <input
                            type="radio"
                            name={item.key}
                            value={value}
                            checked={checked}
                            onChange={() => setAnswers((prev) => ({ ...prev, [item.key]: value }))}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            {!anyAnswered && (
              <p style={{ fontSize: "0.82rem", color: "var(--color-warning)", marginTop: "0.5rem" }}>
                ⚠ Rate at least one item to enable submission. Unrated items will be recorded as <em>unsure</em>.
              </p>
            )}

            {/* Service rating */}
            <div className="form-row" style={{ marginTop: "1rem" }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                Service Rating <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>(optional)</span>
              </label>
              <div className="star-picker" role="group" aria-label="Service rating">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button"
                    className={`star-btn ${n <= serviceRating ? "star-btn--on" : ""}`}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    aria-pressed={n === serviceRating}
                    onClick={() => setServiceRating(n === serviceRating ? 0 : n)}>
                    {n <= serviceRating ? "★" : "☆"}
                  </button>
                ))}
                {serviceRating > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginLeft: 6 }}>
                    {serviceRating}/5
                  </span>
                )}
              </div>
            </div>

            <div className="form-row" style={{ marginTop: "1rem" }}>
              <label htmlFor="review-note" style={{ fontWeight: 600 }}>
                Note <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>(optional)</span>
              </label>
              <div className="input-group">
                <textarea
                  className="input textarea"
                  id="review-note"
                  placeholder="Anything else to add? e.g. ramp was steep, staff were very helpful…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* Photo upload */}
            <div className="form-row" style={{ marginTop: "1rem" }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                Photo proof <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>(optional, max 5 MB)</span>
              </label>

              {preview ? (
                <div className="photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Photo preview" className="photo-preview__img" />
                  <button type="button" className="photo-preview__remove btn btn--ghost" onClick={removePhoto}
                    aria-label="Remove photo">
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <label className="photo-upload-area" htmlFor="photo-input">
                  <span>Click to choose a photo</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>JPG, PNG, WEBP · max 5 MB</span>
                </label>
              )}
              <input
                ref={fileRef}
                id="photo-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            <div className="actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting || !anyAnswered}
                aria-busy={submitting}
              >
                {submitting ? "Saving…" : isEdit ? "Save Changes" : "Submit Rating"}
              </button>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

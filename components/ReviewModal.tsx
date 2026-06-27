"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface EditRating {
  id: string;
  answers: Record<string, string>;
  note: string;
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

export default function ReviewModal({ venueId, place, onClose, onSaved, editRating }: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isEdit = !!editRating;

  const [answers, setAnswers] = useState<Answers>(() =>
    editRating
      ? { ...editRating.answers } as Answers
      : Object.fromEntries(ITEMS.map((i) => [i.key, "" as Answer]))
  );
  const [note, setNote]             = useState(editRating?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  const allAnswered = ITEMS.every((i) => answers[i.key] !== "");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!allAnswered) { setError("Please answer all 5 checklist items."); return; }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/sign-in"); return; }

    setSubmitting(true);

    const payload = {
      entrance:           answers.entrance,
      walkwayDoorWidth:   answers.walkwayDoorWidth,
      accessibleRestroom: answers.accessibleRestroom,
      tableSeating:       answers.tableSeating,
      parking:            answers.parking,
      note:               note.trim() || undefined,
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
    if (live) live.textContent = isEdit
      ? `Rating updated for ${place}.`
      : `Rating submitted for ${place}. Thank you!`;
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
          All 5 items are required.
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

            <div className="actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting || !allAnswered}
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

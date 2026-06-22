"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  venueSlug: string;
  place: string;
  onClose: () => void;
}

export default function ReviewModal({ venueSlug, place, onClose }: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const modal = document.getElementById("review-modal");
    if (!modal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    modal.addEventListener("keydown", handleKey);
    return () => modal.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitError("");

    // Verify the user is signed in
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/sign-in");
      return;
    }
    const data = new FormData(form);
    const serviceRaw = data.get("service") as string;
    const facilityRaw = data.get("facility") as string;
    const comment = (data.get("comment") as string)?.trim();
    const isAnonymous = (data.get("anonymous") as string) === "on";

    if (!serviceRaw || !facilityRaw) {
      setSubmitError("Please select both a service and facility rating.");
      return;
    }

    // Map form values (poor/ok/good) to enum (POOR/OKAY/GOOD)
    const toEnum = (v: string) => v === "good" ? "GOOD" : v === "ok" ? "OKAY" : "POOR";

    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug,
        serviceRating: toEnum(serviceRaw),
        facilityRating: toEnum(facilityRaw),
        comment: comment || null,
        isAnonymous,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setSubmitError(json.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
    const live = document.getElementById("sr-live");
    if (live) live.textContent = `Review submitted for ${place}. Thank you!`;
  };

  return (
    <div
      id="review-modal"
      className="modal modal--open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      aria-describedby="review-desc"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal__panel" role="document">
        <h2 id="review-title" className="modal__title" ref={titleRef} tabIndex={-1}>
          Submit Review
        </h2>
        <p id="review-desc" className="helper">
          Share your experience at <strong>{place}</strong>. Fields marked * are required.
        </p>

        {success ? (
          <div role="alert" style={{ padding: "1.5rem 0" }}>
            <p style={{ color: "var(--color-success)", fontWeight: 600, marginBottom: "1rem" }}>
              Thank you! Your review has been submitted.
            </p>
            <button type="button" className="btn btn--primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form id="review-form" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <p className="error-msg" role="alert" aria-live="assertive" style={{ marginBottom: "1rem" }}>
                {submitError}
              </p>
            )}

            <div className="form-row">
              <span className="helper">Service *</span>
              <div className="radio-group" role="radiogroup" aria-label="Service level">
                <label><input type="radio" name="service" value="poor" required /> Need Improvement</label>
                <label><input type="radio" name="service" value="ok" /> Okay</label>
                <label><input type="radio" name="service" value="good" /> Recommended</label>
              </div>
            </div>

            <div className="form-row">
              <span className="helper">Facilities *</span>
              <div className="radio-group" role="radiogroup" aria-label="Facility level">
                <label><input type="radio" name="facility" value="poor" required /> Need Improvement</label>
                <label><input type="radio" name="facility" value="ok" /> Okay</label>
                <label><input type="radio" name="facility" value="good" /> Recommended</label>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="comment">Comment</label>
              <div className="input-group">
                <textarea
                  className="input textarea"
                  id="comment"
                  name="comment"
                  placeholder="Enter your comment"
                />
                <VoiceButton targetId="comment" label="Activate voice comment" />
              </div>
            </div>

            <div className="form-row">
              <label className="checkbox">
                <input type="checkbox" name="anonymous" />
                {" "}Submit anonymously
              </label>
            </div>

            <div className="actions">
              <button type="submit" className="btn btn--primary" disabled={submitting} aria-busy={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
              <button type="button" className="btn" onClick={onClose}>Close</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function VoiceButton({ targetId, label }: { targetId: string; label: string }) {
  const start = () => {
    const win = window as unknown as Record<string, unknown>;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SR as any)();
    rec.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
      if (el) el.value = e.results[0][0].transcript;
    };
    rec.start();
  };

  return (
    <button type="button" className="btn--voice" aria-label={label} onClick={start}>
      🎤
    </button>
  );
}

"use client";

import { useEffect, useRef } from "react";

interface Ratings {
  blind: number;
  hearing: number;
  mobility: number;
}

interface LocationData {
  title: string;
  description: string;
  services: string[];
  mapUrl: string;
}

interface Props {
  locationKey: string;
  ratings: Ratings;
  onClose: () => void;
}

const locationsData: Record<string, LocationData> = {
  pho24: {
    title: "Phở 24 Restaurant",
    description: "Traditional phở restaurant chain. Fast service, modern ambiance, disability-friendly.",
    services: ["Sign language support", "Guide dog area", "Disability-friendly delivery"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Ph%E1%BB%9F+24,+H%C3%A0+N%E1%BB%99i,+Vi%E1%BB%87t+Nam",
  },
  "tch-nguyenhue": {
    title: "The Coffee House Signature",
    description: "Flagship store with automatic sliding doors, elevator to all floors, braille & large-print menus, induction loop at counter.",
    services: ["Elevator access", "Braille menus", "Induction hearing loop", "Accessible restrooms"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=The+Coffee+House+Signature,+Ho+Chi+Minh+City",
  },
  "pho-hoa": {
    title: "Phở Hòa Pasteur",
    description: "Legendary phở restaurant with flat entrance, wide aisles, wheelchair-accessible toilet on ground floor, and very supportive staff.",
    services: ["Wheelchair accessible toilet", "Flat entrance", "Wide aisles"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Pho+Hoa+Pasteur,+Ho+Chi+Minh+City",
  },
  "starbucks-reserve": {
    title: "Starbucks Reserve Nhà Thờ Đức Bà",
    description: "Global accessibility standard: automatic doors, braille signage, hearing loop, mobile order & pay, spacious layout, and accessible restroom.",
    services: ["Automatic doors", "Braille signage", "Hearing loop", "Mobile ordering", "Accessible restroom"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Starbucks+Reserve+Nha+Tho,+Ho+Chi+Minh+City",
  },
  pizza4p: {
    title: "Pizza 4P's Lê Thánh Tôn",
    description: "Elevator to upper floors, spacious wheelchair turning space, high-contrast menu, staff trained in basic sign language.",
    services: ["Elevator", "Wheelchair turning space", "High-contrast menu", "Sign language trained staff"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Pizza+4Ps+Le+Thanh+Ton,+Ho+Chi+Minh+City",
  },
  "banhmi-hh": {
    title: "Bánh Mì Huỳnh Hoa",
    description: "Iconic street stall – small step at entrance, very narrow interior, no accessible toilet.",
    services: ["Takeaway available"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Banh+Mi+Huynh+Hoa,+Ho+Chi+Minh+City",
  },
  laude404: {
    title: "Lẩu Dê 404 Phạm Văn Đồng",
    description: "Ramp, large parking, wheelchair toilet, adjustable tables, visual fire alarm.",
    services: ["Ramp access", "Wheelchair toilet", "Adjustable tables", "Visual fire alarm"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Lau+De+404,+Ho+Chi+Minh+City",
  },
  "cong-president": {
    title: "Cộng Cà Phê President Place",
    description: "Retro vibe, ramp access, large-print menu, quiet corner available.",
    services: ["Ramp access", "Large-print menu", "Quiet seating area"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Cong+Cafe+President+Place,+Ho+Chi+Minh+City",
  },
  bunbo77: {
    title: "Bún Bò Nam Bộ 77 Bùi Viện",
    description: "Small step at entrance, narrow space, outdoor seating only – limited accessibility.",
    services: ["Outdoor seating"],
    mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Bun+Bo+77+Bui+Vien,+Ho+Chi+Minh+City",
  },
};

const staticFeedback = [
  { user: "Anonymous ✅", service: "Recommended", facility: "Okay", comment: "Good coffee, easy access" },
  { user: "Anonymous", service: "Okay", facility: "Need Improvement", comment: "Staff were helpful but parking was tight" },
  { user: "Anonymous", service: "Recommended", facility: "Okay", comment: "Nice ambiance, needs better signage" },
];

export default function DetailModal({ locationKey, ratings, onClose }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const data = locationsData[locationKey];

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const modal = document.getElementById("detail-modal");
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

  if (!data) return null;

  const clamp = (v: number) => Math.max(0, Math.min(100, v || 0));

  return (
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
          {data.title}
        </h2>
        <p>{data.description}</p>

        <h3>Accessibility by Disability</h3>
        <div className="ratings-grid" aria-label="Accessibility ratings by disability">
          {(["Blind", "Hearing", "Mobility"] as const).map((label) => {
            const key = label.toLowerCase() as keyof Ratings;
            const v = clamp(ratings[key]);
            return (
              <div key={label} className="rating-line" role="group" aria-label={`${label} ${v}%`}>
                <span className="rating-label">{label}</span>
                <span
                  className="progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={v}
                  aria-label={`${v}% accessibility for ${label.toLowerCase()}`}
                >
                  <span className="progress__bar" style={{ width: `${v}%` }} />
                </span>
                <span className="rating-num">{v}</span>
              </div>
            );
          })}
        </div>

        <h3>Special Services</h3>
        <ul>
          {data.services.map((s) => <li key={s}>{s}</li>)}
        </ul>

        <h3>Customer Feedback ({staticFeedback.length})</h3>
        <div className="feedback-container">
          <ul className="feedback-list">
            {staticFeedback.map((fb, i) => (
              <li key={i}>
                <strong>{fb.user} (Service: {fb.service}, Facilities: {fb.facility})</strong>
                &ldquo;{fb.comment}&rdquo;
              </li>
            ))}
          </ul>
          <div className="feedback-actions">
            <button type="button" className="btn btn--primary" aria-label="Load more customer feedback">
              Load More Feedback
            </button>
          </div>
        </div>

        <div className="actions">
          <a
            href={data.mapUrl}
            className="btn btn--primary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get directions on Google Maps"
          >
            Get Directions
          </a>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

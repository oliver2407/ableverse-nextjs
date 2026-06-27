"use client";

import Image from "next/image";

export interface VenueData {
  id: string;
  googlePlaceId: string;
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  category: string;
  distance?: string;
  totalRatings: number;
  entrancePct: number;
  walkwayPct: number;
  restroomPct: number;
  seatingPct: number;
  parkingPct: number;
}

interface Props {
  venue: VenueData;
  onDetail: (venue: VenueData) => void;
  onReview: (id: string, title: string) => void;
}

const CHECKLIST = [
  { key: "entrancePct",  short: "Entrance" },
  { key: "walkwayPct",   short: "Walkway"  },
  { key: "restroomPct",  short: "Restroom" },
  { key: "seatingPct",   short: "Seating"  },
  { key: "parkingPct",   short: "Parking"  },
] as const;

function overallColor(pct: number) {
  if (pct >= 75) return "rating_color1";
  if (pct >= 45) return "rating_color2";
  return "rating_color3";
}

export default function VenueCard({ venue, onDetail, onReview }: Props) {
  const hasData = venue.totalRatings > 0;
  const overall = hasData
    ? Math.round(
        (venue.entrancePct + venue.walkwayPct + venue.restroomPct + venue.seatingPct + venue.parkingPct) / 5
      )
    : null;

  return (
    <article
      className="card card--venue"
      aria-labelledby={`place-${venue.id}`}
    >
      {/* Image */}
      <div className="card__media">
        {venue.photoUrl ? (
          <Image
            src={venue.photoUrl}
            alt={`Photo of ${venue.title}`}
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="card__media-placeholder" aria-hidden="true">🏢</div>
        )}
        {overall !== null && (
          <span className={`card__badge badge--overall ${overallColor(overall)}`} aria-label={`Overall accessibility ${overall}%`}>
            {overall}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className="card__body">
        <h3 id={`place-${venue.id}`} className="card__title">{venue.title}</h3>
        <p className="card__address">{venue.address}</p>

        {/* Checklist scores */}
        {hasData ? (
          <div className="card__scores" aria-label="Accessibility checklist scores">
            {CHECKLIST.map(({ key, short }) => (
              <div key={key} className="score-chip" title={`${short}: ${venue[key]}% yes`}>
                <span className="score-chip__label">{short[0]}</span>
                <span className="score-chip__value">{venue[key]}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="card__no-data">No ratings yet — be the first!</p>
        )}

        {venue.distance && (
          <p className="card__distance">📍 {venue.distance}</p>
        )}
      </div>

      {/* Actions */}
      <div className="card__actions">
        <button
          type="button"
          className="btn btn--primary"
          aria-label={`View details for ${venue.title}`}
          onClick={() => onDetail(venue)}
        >
          Details
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-label={`Rate accessibility of ${venue.title}`}
          onClick={() => onReview(venue.id, venue.title)}
        >
          Rate
        </button>
      </div>

    </article>
  );
}

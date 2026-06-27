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
  entrancePct: number;  entranceNoPct: number;
  walkwayPct: number;   walkwayNoPct: number;
  restroomPct: number;  restroomNoPct: number;
  seatingPct: number;   seatingNoPct: number;
  parkingPct: number;   parkingNoPct: number;
  avgServicePct: number | null;
  hasTeamRating: boolean;
}

interface Props {
  venue: VenueData;
  onDetail: (venue: VenueData) => void;
  onReview: (id: string, title: string) => void;
}

const CHECKLIST = [
  { yesKey: "entrancePct",  noKey: "entranceNoPct",  catKey: "entrance", label: "Entrance" },
  { yesKey: "walkwayPct",   noKey: "walkwayNoPct",   catKey: "walkway",  label: "Walkway"  },
  { yesKey: "restroomPct",  noKey: "restroomNoPct",  catKey: "restroom", label: "Restroom" },
  { yesKey: "seatingPct",   noKey: "seatingNoPct",   catKey: "seating",  label: "Seating"  },
  { yesKey: "parkingPct",   noKey: "parkingNoPct",   catKey: "parking",  label: "Parking"  },
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
        {venue.hasTeamRating && (
          <span className="card__badge badge--team" aria-label="Team verified">
            ✓ Team verified
          </span>
        )}
      </div>

      {/* Body */}
      <div className="card__body">
        <h3 id={`place-${venue.id}`} className="card__title">{venue.title}</h3>
        <p className="card__address">{venue.address}</p>

        {/* Checklist scores */}
        {hasData ? (
          <div className="card__chips" aria-label="Accessibility scores">
            {CHECKLIST.map(({ yesKey, label }) => {
              const yes = venue[yesKey];
              const cls = yes >= 75 ? "chip--green" : yes >= 45 ? "chip--amber" : "chip--red";
              return (
                <span key={yesKey} className={`card__chip ${cls}`}>
                  {label} {yes}%
                </span>
              );
            })}
          </div>
        ) : (
          <p className="card__no-data">No ratings yet — be the first!</p>
        )}

        {venue.avgServicePct !== null && (
          <div
            className="card__service-rating"
            aria-label={`Average service rating ${venue.avgServicePct}%`}
          >
            <span className="card__service-label">Service</span>
            <span className="card__service-stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                i < Math.round(venue.avgServicePct! / 20) ? "★" : "☆"
              )).join("")}
            </span>
            <span className="card__service-pct">{Math.round(venue.avgServicePct! / 20)}/5</span>
          </div>
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

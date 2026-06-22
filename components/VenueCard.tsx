"use client";

import Image from "next/image";

export interface VenueData {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
  isOpen: boolean;
  description: string;
  distance: string;
  blind: number;
  hearing: number;
  mobility: number;
  service: number;
  facility: number;
}

interface Props {
  venue: VenueData;
  onDetail: (id: string, ratings: { blind: number; hearing: number; mobility: number }) => void;
  onReview: (slug: string, title: string) => void;
}

function ratingLabel(score: number): { label: string; colorClass: string } {
  if (score >= 85) return { label: "Highly Recommended", colorClass: "rating_color1" };
  if (score >= 65) return { label: "Recommended", colorClass: "rating_color2" };
  if (score >= 50) return { label: "Okay", colorClass: "rating_color2" };
  return { label: "Need Improvement", colorClass: "rating_color3" };
}

export default function VenueCard({ venue, onDetail, onReview }: Props) {
  const overall = Math.round((venue.blind + venue.hearing + venue.mobility) / 3);
  const { label, colorClass } = ratingLabel(overall);

  return (
    <article
      className="card card--shop"
      aria-labelledby={`place-${venue.id}`}
      data-blind={venue.blind}
      data-hearing={venue.hearing}
      data-mobility={venue.mobility}
      data-service={venue.service}
      data-facility={venue.facility}
    >
      <div className="card__media">
        <Image
          src={`/${venue.image}`}
          alt={venue.imageAlt}
          width={400}
          height={280}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div className="card__body_out">
        <div className="card__body">
          <div className="text-card">
            <h3 id={`place-${venue.id}`}>{venue.title}</h3>
            <div className="card__status" aria-label="Availability status">
              <span className={venue.isOpen ? "status-green status--open" : "status-red status--open"}>
                {venue.isOpen ? "Open Now" : "Closed"}
              </span>
            </div>
            <div className="card__description">
              <p>{venue.description}</p>
            </div>
          </div>
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--primary"
              aria-label={`View details for ${venue.title}`}
              onClick={() => onDetail(venue.id, { blind: venue.blind, hearing: venue.hearing, mobility: venue.mobility })}
            >
              View Details
            </button>
            <button
              type="button"
              className="btn btn--primary"
              aria-label={`Submit review for ${venue.title}`}
              onClick={() => onReview(venue.id, venue.title)}
            >
              Submit Review
            </button>
          </div>
        </div>

        <div className="card__a11y sr-only">
          <span aria-label={`Accessibility for blind ${venue.blind} percent`} />
          <span aria-label={`Accessibility for hearing impairment ${venue.hearing} percent`} />
          <span aria-label={`Accessibility for mobility impairment ${venue.mobility} percent`} />
        </div>
      </div>

      <aside className="card__meta" aria-label="Ratings">
        <div className="card_meta_mini">
          <div className="rating__overall">{label}</div>
          <div
            className={`rating__overall ${colorClass}`}
            role="img"
            aria-label={`Overall accessibility score ${overall} out of 100`}
          >
            <span className="rating__value">{overall}</span>
            <span className="rating__suffix">/100</span>
          </div>
        </div>
        <p className="distance">{venue.distance}</p>
      </aside>
    </article>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import VenueCard, { VenueData } from "@/components/VenueCard";
import ReviewModal from "@/components/ReviewModal";
import DetailModal from "@/components/DetailModal";

const PAGE_SIZE = 6;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomePage() {
  const [venues, setVenues]               = useState<VenueData[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);

  const [reviewTarget, setReviewTarget]   = useState<{ id: string; title: string } | null>(null);
  const [detailVenue, setDetailVenue]     = useState<VenueData | null>(null);

  // Search / filter state
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDistance, setFilterDistance] = useState("");
  const [userLat, setUserLat]               = useState<number | null>(null);
  const [userLng, setUserLng]               = useState<number | null>(null);
  const [geoError, setGeoError]             = useState("");

  useEffect(() => {
    fetch("/api/venues")
      .then((r) => r.json())
      .then((data) => { setVenues(Array.isArray(data) ? data : []); setVenuesLoading(false); })
      .catch(() => setVenuesLoading(false));
  }, []);

  useEffect(() => {
    if (!filterDistance || userLat !== null) return;
    if (!navigator.geolocation) { setGeoError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setGeoError(""); },
      () => setGeoError("Could not get your location. Distance filter disabled.")
    );
  }, [filterDistance, userLat]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, filterCategory, filterDistance]);

  const filteredVenues = useMemo(() => {
    let list = venues;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) => v.title.toLowerCase().includes(q) || v.address.toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      list = list.filter((v) => v.category === filterCategory);
    }

    const maxKm = filterDistance ? parseInt(filterDistance) : null;
    if (maxKm && userLat !== null && userLng !== null) {
      list = list.filter((v) => {
        if (!v.lat || !v.lng) return true;
        return haversineKm(userLat, userLng, v.lat, v.lng) <= maxKm;
      });
    }

    return list;
  }, [venues, searchQuery, filterCategory, filterDistance, userLat, userLng]);

  const displayVenues = useMemo(() => {
    if (userLat === null || userLng === null) return filteredVenues;
    return filteredVenues.map((v) => {
      if (!v.lat || !v.lng) return v;
      const km = haversineKm(userLat, userLng, v.lat, v.lng);
      return { ...v, distance: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km` };
    });
  }, [filteredVenues, userLat, userLng]);

  const loadMore = () => {
    const next = Math.min(visibleCount + PAGE_SIZE, displayVenues.length);
    setVisibleCount(next);
    const live = document.getElementById("sr-live");
    if (live) live.textContent = next >= displayVenues.length ? "All locations loaded." : `${PAGE_SIZE} more locations loaded.`;
  };

  const handleVoiceSearch = () => {
    const win = window as unknown as Record<string, unknown>;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SR as any)();
    rec.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t: string = e.results[0][0].transcript;
      setSearchQuery(t);
      const live = document.getElementById("sr-live");
      if (live) live.textContent = `Search set to: ${t}`;
    };
    rec.start();
    const live = document.getElementById("sr-live");
    if (live) live.textContent = "Voice search activated. Please speak now.";
  };

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const live = document.getElementById("sr-live");
    if (live) {
      const n = filteredVenues.length;
      live.textContent = n === 0 ? "No locations match." : `${n} location${n !== 1 ? "s" : ""} found.`;
    }
  };

  return (
    <>
      <header role="banner" id="main-content">
        <div className="container hero">
          <h1 className="hero__title">Ableverse – Accessibility Rankings</h1>
          <p className="hero__subtitle">
            Crowdsourced wheelchair &amp; disability accessibility ratings for cafes and restaurants in District 7, Ho Chi Minh City.
          </p>

          <form id="hero-search" className="hero__form" role="search" aria-label="Search for locations" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="search-input">Search</label>
            <div className="input-group">
              <input
                className="input"
                type="text"
                id="search-input"
                placeholder="Search by name or address…"
                aria-label="Search venues"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" className="btn--voice" aria-label="Activate voice search" onClick={handleVoiceSearch}>🎤</button>
            </div>

            <label className="sr-only" htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              aria-label="Filter by category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All categories</option>
              <option value="cafe">Cafe</option>
              <option value="restaurant">Restaurant</option>
            </select>

            <label className="sr-only" htmlFor="filter-distance">Distance</label>
            <select
              id="filter-distance"
              aria-label="Filter by distance"
              value={filterDistance}
              onChange={(e) => setFilterDistance(e.target.value)}
            >
              <option value="">Any distance</option>
              <option value="1">Within 1 km</option>
              <option value="2">Within 2 km</option>
              <option value="5">Within 5 km</option>
            </select>

            <button type="submit" className="btn btn--primary" aria-label="Search">Search</button>
          </form>

          {geoError && (
            <p role="alert" style={{ color: "var(--color-warning)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{geoError}</p>
          )}
        </div>
      </header>

      <main className="container">
        <section id="results" className="results" role="region" aria-label="Venue results">
          {venuesLoading ? (
            <p style={{ gridColumn: "1/-1", padding: "2rem 0", color: "var(--color-text-muted)" }}>Loading venues…</p>
          ) : displayVenues.length === 0 ? (
            <p style={{ gridColumn: "1/-1", padding: "2rem 0", color: "var(--color-text-muted)" }}>
              {venues.length === 0
                ? <>No venues found. Run <code>npm run seed</code> to populate the database.</>
                : "No venues match your search."}
            </p>
          ) : (
            <>
              {displayVenues.slice(0, visibleCount).map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onDetail={setDetailVenue}
                  onReview={(id, title) => setReviewTarget({ id, title })}
                />
              ))}
              {visibleCount < displayVenues.length && (
                <div className="results__more">
                  <button type="button" className="btn btn--primary" onClick={loadMore}>
                    Load more ({displayVenues.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {reviewTarget && (
        <ReviewModal venueId={reviewTarget.id} place={reviewTarget.title} onClose={() => setReviewTarget(null)} />
      )}
      {detailVenue && (
        <DetailModal venue={detailVenue} onClose={() => setDetailVenue(null)} />
      )}
    </>
  );
}

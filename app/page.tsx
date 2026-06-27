"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import VenueCard, { VenueData } from "@/components/VenueCard";

const ReviewModal = dynamic(() => import("@/components/ReviewModal"), { ssr: false });
const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

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

  // Search / filter / sort state
  const [searchQuery, setSearchQuery]       = useState("");
  const [appliedSearch, setAppliedSearch]   = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDistance, setFilterDistance] = useState("");
  const [sortBy, setSortBy]                 = useState("overall");
  const [sortDir, setSortDir]               = useState<"desc" | "asc">("desc");
  const [userLat, setUserLat]               = useState<number | null>(null);
  const [userLng, setUserLng]               = useState<number | null>(null);
  const [geoError, setGeoError]             = useState("");

  const fetchVenues = useCallback((search: string, category: string) => {
    setVenuesLoading(true);
    const params = new URLSearchParams();
    if (search)   params.set("search", search);
    if (category) params.set("category", category);
    const url = `/api/venues${params.size > 0 ? `?${params}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setVenues(data);
        setVenuesLoading(false);
        setDetailVenue((prev) => prev ? (data.find((v: VenueData) => v.id === prev.id) ?? prev) : null);
      })
      .catch(() => setVenuesLoading(false));
  }, []);

  const refreshVenues = useCallback(() => {
    fetchVenues(appliedSearch, filterCategory);
  }, [fetchVenues, appliedSearch, filterCategory]);

  useEffect(() => { fetchVenues("", ""); }, [fetchVenues]);

  useEffect(() => {
    if (!filterDistance || userLat !== null) return;
    if (!navigator.geolocation) { setGeoError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setGeoError(""); },
      () => setGeoError("Could not get your location. Distance filter disabled.")
    );
  }, [filterDistance, userLat]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [venues, filterDistance, sortBy, sortDir]);

  function getScore(v: VenueData, key: string): number {
    switch (key) {
      case "overall":  return v.totalRatings === 0 ? -1 : (v.entrancePct + v.walkwayPct + v.restroomPct + v.seatingPct + v.parkingPct) / 5;
      case "service":  return v.avgServicePct ?? -1;
      case "entrance": return v.totalRatings === 0 ? -1 : v.entrancePct;
      case "walkway":  return v.totalRatings === 0 ? -1 : v.walkwayPct;
      case "restroom": return v.totalRatings === 0 ? -1 : v.restroomPct;
      case "seating":  return v.totalRatings === 0 ? -1 : v.seatingPct;
      case "parking":  return v.totalRatings === 0 ? -1 : v.parkingPct;
      default:         return -1;
    }
  }

  const filteredVenues = useMemo(() => {
    let list = venues;

    const maxKm = filterDistance ? parseInt(filterDistance) : null;
    if (maxKm && userLat !== null && userLng !== null) {
      list = list.filter((v) => {
        if (!v.lat || !v.lng) return true;
        return haversineKm(userLat, userLng, v.lat, v.lng) <= maxKm;
      });
    }

    list = [...list].sort((a, b) => {
      const diff = getScore(b, sortBy) - getScore(a, sortBy);
      return sortDir === "asc" ? -diff : diff;
    });

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, filterDistance, sortBy, sortDir, userLat, userLng]);

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
      setAppliedSearch(t);
      fetchVenues(t, filterCategory);
      const live = document.getElementById("sr-live");
      if (live) live.textContent = `Searching for: ${t}`;
    };
    rec.start();
    const live = document.getElementById("sr-live");
    if (live) live.textContent = "Voice search activated. Please speak now.";
  };

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setAppliedSearch(q);
    fetchVenues(q, filterCategory);
    const live = document.getElementById("sr-live");
    if (live) live.textContent = q ? `Searching for "${q}"…` : "Loading all venues…";
  };

  return (
    <>
      <header role="banner" id="main-content">
        <div className="container hero">
          <h1 className="hero__title">Ableverse – Accessibility Rankings</h1>
          <p className="hero__subtitle">
            Crowdsourced wheelchair &amp; disability accessibility ratings for cafes and restaurants in Ho Chi Minh City.
          </p>

          <form id="hero-search" className="hero__form" role="search" aria-label="Search for locations" onSubmit={handleSearch}>
            <svg className="hero__search-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <label className="sr-only" htmlFor="search-input">Search</label>
            <input
              className="hero__search-input"
              type="text"
              id="search-input"
              placeholder="Search venues by name or address…"
              aria-label="Search venues"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="button" className="btn--voice" aria-label="Activate voice search" onClick={handleVoiceSearch}>
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button type="submit" className="btn hero__search-btn" aria-label="Search">Search</button>
          </form>
        </div>
      </header>

      {/* Sticky filter bar */}
      <div className="filter-bar" role="search" aria-label="Filter venues">
        <div className="container filter-bar__inner">
          <label className="sr-only" htmlFor="filter-category">Category</label>
          <select
            id="filter-category"
            aria-label="Filter by category"
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); fetchVenues(appliedSearch, e.target.value); }}
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

          <label className="sr-only" htmlFor="sort-by">Sort by</label>
          <select
            id="sort-by"
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="overall">Overall accessibility</option>
            <option value="service">Service rating</option>
            <option value="entrance">Step-free entrance</option>
            <option value="walkway">Walkway &amp; door width</option>
            <option value="restroom">Accessible restroom</option>
            <option value="seating">Accessible seating</option>
            <option value="parking">Accessible parking</option>
          </select>

          <button
            type="button"
            className="btn btn--ghost sort-dir-btn"
            aria-label={sortDir === "desc" ? "Currently highest first — click for lowest first" : "Currently lowest first — click for highest first"}
            title={sortDir === "desc" ? "Highest first" : "Lowest first"}
            onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
          >
            {sortDir === "desc" ? "↓ High–Low" : "↑ Low–High"}
          </button>

          {geoError && (
            <p role="alert" style={{ color: "var(--color-warning)", fontSize: "0.82rem", margin: 0 }}>{geoError}</p>
          )}

          <span className="filter-bar__count">
            {venuesLoading ? "" : `${filteredVenues.length} venue${filteredVenues.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

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
        <ReviewModal venueId={reviewTarget.id} place={reviewTarget.title} onClose={() => setReviewTarget(null)} onSaved={() => { setReviewTarget(null); refreshVenues(); }} />
      )}
      {detailVenue && (
        <DetailModal venue={detailVenue} onClose={() => setDetailVenue(null)} onRatingChanged={refreshVenues} />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import VenueCard, { VenueData } from "@/components/VenueCard";
import ReviewModal from "@/components/ReviewModal";
import DetailModal from "@/components/DetailModal";

const VENUES: VenueData[] = [
  {
    id: "acafe",
    title: "A Cafe",
    image: "a.jpg",
    imageAlt: "Front of A Cafe",
    isOpen: true,
    description:
      "A Cafe offers a cozy atmosphere with a wide selection of coffee and pastries. Standout features for blind visitors include braille menus, tactile signage throughout the space, and staff trained in guiding techniques.",
    distance: "2.4 km",
    blind: 85, hearing: 90, mobility: 80, service: 80, facility: 70,
  },
  {
    id: "pho24",
    title: "Phở 24 Restaurant",
    image: "b.jpg",
    imageAlt: "Front of Phở 24 Restaurant",
    isOpen: false,
    description:
      "Phở 24 Restaurant is renowned for its authentic Vietnamese phở. Highlights include ample wheelchair-accessible parking, a spacious dining area, and a welcoming ambiance.",
    distance: "3 km",
    blind: 65, hearing: 50, mobility: 80, service: 80, facility: 70,
  },
  {
    id: "tch-nguyenhue",
    title: "The Coffee House Signature",
    image: "signaturebythecoffeehouse.jpg",
    imageAlt: "The Coffee House Signature Nguyễn Huệ, Quận 1",
    isOpen: true,
    description:
      "Flagship store with automatic sliding doors, elevator to all floors, braille & large-print menus, induction loop at counter.",
    distance: "0.8 km",
    blind: 94, hearing: 90, mobility: 96, service: 95, facility: 93,
  },
  {
    id: "pho-hoa",
    title: "Phở Hòa Pasteur",
    image: "phohoapasteur.webp",
    imageAlt: "Phở Hòa Pasteur, Quận 3",
    isOpen: true,
    description:
      "Legendary phở restaurant with flat entrance, wide aisles, wheelchair-accessible toilet on ground floor, and very supportive staff.",
    distance: "2.1 km",
    blind: 72, hearing: 68, mobility: 88, service: 85, facility: 80,
  },
  {
    id: "starbucks-reserve",
    title: "Starbucks Reserve Nhà Thờ Đức Bà",
    image: "Starbucks-Reserve-Nha-Tho.jpg",
    imageAlt: "Starbucks Reserve Nhà Thờ Đức Bà, Quận 1",
    isOpen: true,
    description:
      "Global accessibility standard: automatic doors, braille signage, hearing loop, mobile order & pay, spacious layout, and accessible restroom.",
    distance: "0.5 km",
    blind: 90, hearing: 92, mobility: 89, service: 94, facility: 91,
  },
  {
    id: "pizza4p",
    title: "Pizza 4P's Lê Thánh Tôn",
    image: "4pizza.jpg",
    imageAlt: "Pizza 4P's Lê Thánh Tôn, Quận 1",
    isOpen: true,
    description:
      "Elevator to upper floors, spacious wheelchair turning space, high-contrast menu, staff trained in basic sign language.",
    distance: "1.2 km",
    blind: 82, hearing: 85, mobility: 90, service: 88, facility: 86,
  },
  {
    id: "banhmi-hh",
    title: "Bánh Mì Huỳnh Hoa",
    image: "huynh-hoa-bread.jpeg",
    imageAlt: "Bánh Mì Huỳnh Hoa Lê Thị Riêng, Quận 1",
    isOpen: true,
    description:
      "Iconic street stall – small step at entrance, very narrow interior, no accessible toilet.",
    distance: "1.5 km",
    blind: 48, hearing: 55, mobility: 62, service: 80, facility: 50,
  },
  {
    id: "laude404",
    title: "Lẩu Dê 404 Phạm Văn Đồng",
    image: "laude.jpg",
    imageAlt: "Lẩu Dê 404 Phạm Văn Đồng, Thủ Đức",
    isOpen: true,
    description: "Ramp, large parking, wheelchair toilet, adjustable tables, visual fire alarm.",
    distance: "11 km",
    blind: 78, hearing: 75, mobility: 92, service: 87, facility: 85,
  },
  {
    id: "cong-president",
    title: "Cộng Cà Phê President Place",
    image: "cong-cafe.webp",
    imageAlt: "Cộng Cà Phê President Place Nguyễn Thị Minh Khai",
    isOpen: true,
    description: "Retro vibe, ramp access, large-print menu, quiet corner available.",
    distance: "2.7 km",
    blind: 85, hearing: 80, mobility: 88, service: 90, facility: 87,
  },
  {
    id: "bunbo77",
    title: "Bún Bò Nam Bộ 77 Bùi Viện",
    image: "bunbo.jpg",
    imageAlt: "Bún Bò Nam Bộ 77 Bùi Viện, Quận 1",
    isOpen: true,
    description: "Small step at entrance, narrow space, outdoor seating only – limited accessibility.",
    distance: "1.9 km",
    blind: 60, hearing: 65, mobility: 75, service: 78, facility: 68,
  },
];

const PAGE_SIZE = 3;

export default function HomePage() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [reviewTarget, setReviewTarget] = useState<{ slug: string; title: string } | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailRatings, setDetailRatings] = useState({ blind: 0, hearing: 0, mobility: 0 });

  const openDetail = (key: string, ratings: { blind: number; hearing: number; mobility: number }) => {
    setDetailKey(key);
    setDetailRatings(ratings);
  };

  const loadMore = () => {
    const next = Math.min(visibleCount + PAGE_SIZE, VENUES.length);
    setVisibleCount(next);
    const live = document.getElementById("sr-live");
    if (live) {
      live.textContent =
        next >= VENUES.length
          ? "All locations have been loaded."
          : `${PAGE_SIZE} more locations loaded.`;
    }
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
      const el = document.getElementById("search-input") as HTMLInputElement | null;
      if (el) el.value = e.results[0][0].transcript;
      const live = document.getElementById("sr-live");
      if (live) live.textContent = `Search input set to: ${e.results[0][0].transcript}`;
    };
    rec.start();
    const live = document.getElementById("sr-live");
    if (live) live.textContent = "Voice search activated. Please speak now.";
  };

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (document.getElementById("search-input") as HTMLInputElement)?.value.trim();
    const cat = (document.getElementById("filter-category") as HTMLSelectElement)?.value;
    const dis = (document.getElementById("filter-disability") as HTMLSelectElement)?.value;
    const live = document.getElementById("sr-live");
    if (live) live.textContent = `Searching for: "${q}" • Distance: ${cat || "any"} • Disability: ${dis || "any"}`;
  };

  return (
    <>
      {/* Hero */}
      <header role="banner" id="main-content">
        <div className="container hero">
          <h1 className="hero__title">Ableverse – Accessibility Rankings</h1>
          <p className="hero__subtitle">
            Enter a term and choose filters to check accessibility scores across Vietnam.
          </p>

          <form
            id="hero-search"
            className="hero__form"
            role="search"
            aria-label="Search for locations"
            onSubmit={handleSearch}
          >
            <label className="sr-only" htmlFor="search-input">Search</label>
            <div className="input-group">
              <input
                className="input"
                type="text"
                id="search-input"
                placeholder="Search (e.g., restaurants near Hanoi)"
                aria-label="Search for disability-friendly infrastructure"
              />
              <button
                type="button"
                className="btn--voice"
                aria-label="Activate voice search"
                onClick={handleVoiceSearch}
              >
                🎤
              </button>
            </div>

            <label className="sr-only" htmlFor="filter-category">Distance</label>
            <select id="filter-category" aria-label="Select distance radius">
              <option value="">Location</option>
              <option value="5km">5 km</option>
              <option value="10km">10 km</option>
              <option value="20km">20 km</option>
            </select>

            <label className="sr-only" htmlFor="filter-disability">Disability Type</label>
            <select id="filter-disability" aria-label="Select disability type">
              <option value="">Disability Type</option>
              <option value="blind">Vision Impairment</option>
              <option value="hearing">Hearing Impairment</option>
              <option value="mobility">Mobility Impairment</option>
              <option value="all">Prefer Not to Say</option>
            </select>

            <button type="submit" className="btn btn--primary" aria-label="Search">
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Results */}
      <main className="container">
        <section
          id="results"
          className="results"
          role="region"
          aria-label="Ranking results"
        >
          {VENUES.slice(0, visibleCount).map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onDetail={openDetail}
              onReview={(slug, title) => setReviewTarget({ slug, title })}
            />
          ))}

          {visibleCount < VENUES.length && (
            <div className="results__more">
              <button
                type="button"
                className="btn btn--primary"
                aria-label="Load more results"
                onClick={loadMore}
              >
                View more
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {reviewTarget !== null && (
        <ReviewModal
          venueSlug={reviewTarget.slug}
          place={reviewTarget.title}
          onClose={() => setReviewTarget(null)}
        />
      )}
      {detailKey !== null && (
        <DetailModal
          locationKey={detailKey}
          ratings={detailRatings}
          onClose={() => setDetailKey(null)}
        />
      )}
    </>
  );
}

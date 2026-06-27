import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SummaryRow {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  photo_url: string | null;
  category: string;
  total_ratings: number;
  entrance_pct: number;
  walkway_pct: number;
  restroom_pct: number;
  seating_pct: number;
  parking_pct: number;
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<SummaryRow[]>`
      SELECT
        v.id,
        v.google_place_id,
        v.name,
        v.address,
        v.lat,
        v.lng,
        v.photo_url,
        v.category,
        COALESCE(s.total_ratings, 0)::int  AS total_ratings,
        COALESCE(s.entrance_pct,  0)::int  AS entrance_pct,
        COALESCE(s.walkway_pct,   0)::int  AS walkway_pct,
        COALESCE(s.restroom_pct,  0)::int  AS restroom_pct,
        COALESCE(s.seating_pct,   0)::int  AS seating_pct,
        COALESCE(s.parking_pct,   0)::int  AS parking_pct
      FROM venues v
      LEFT JOIN venue_accessibility_summary s ON v.id = s.venue_id
      ORDER BY v.name ASC
    `;

    const result = rows.map((r) => ({
      id:           r.id,
      googlePlaceId: r.google_place_id,
      title:        r.name,
      address:      r.address,
      lat:          r.lat,
      lng:          r.lng,
      photoUrl:     r.photo_url,
      category:     r.category,
      totalRatings: r.total_ratings,
      entrancePct:  r.entrance_pct,
      walkwayPct:   r.walkway_pct,
      restroomPct:  r.restroom_pct,
      seatingPct:   r.seating_pct,
      parkingPct:   r.parking_pct,
    }));

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/venues]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

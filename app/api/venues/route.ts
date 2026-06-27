import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // cache for 60 s, stale-while-revalidate

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
  entrance_pct: number;   entrance_no_pct: number;
  walkway_pct: number;    walkway_no_pct: number;
  restroom_pct: number;   restroom_no_pct: number;
  seating_pct: number;    seating_no_pct: number;
  parking_pct: number;    parking_no_pct: number;
  avg_service_pct: number | null;
  has_team_rating: boolean | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";

    const conditions: Prisma.Sql[] = [];
    if (search) {
      const safeTerm = "%" + search.replace(/[%_\\]/g, "\\$&") + "%";
      conditions.push(Prisma.sql`(v.name ILIKE ${safeTerm} ESCAPE '\\' OR v.address ILIKE ${safeTerm} ESCAPE '\\')`);
    }
    if (category) conditions.push(Prisma.sql`v.category = ${category}`);
    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

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
        COALESCE(s.total_ratings,    0)::int AS total_ratings,
        COALESCE(s.entrance_pct,     0)::int AS entrance_pct,
        COALESCE(s.entrance_no_pct,  0)::int AS entrance_no_pct,
        COALESCE(s.walkway_pct,      0)::int AS walkway_pct,
        COALESCE(s.walkway_no_pct,   0)::int AS walkway_no_pct,
        COALESCE(s.restroom_pct,     0)::int AS restroom_pct,
        COALESCE(s.restroom_no_pct,  0)::int AS restroom_no_pct,
        COALESCE(s.seating_pct,      0)::int AS seating_pct,
        COALESCE(s.seating_no_pct,   0)::int AS seating_no_pct,
        COALESCE(s.parking_pct,      0)::int AS parking_pct,
        COALESCE(s.parking_no_pct,   0)::int AS parking_no_pct,
        s.avg_service_pct,
        COALESCE(s.has_team_rating, false) AS has_team_rating
      FROM venues v
      LEFT JOIN venue_accessibility_summary s ON v.id = s.venue_id
      ${where}
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
      totalRatings:    r.total_ratings,
      entrancePct:     r.entrance_pct,   entranceNoPct:  r.entrance_no_pct,
      walkwayPct:      r.walkway_pct,    walkwayNoPct:   r.walkway_no_pct,
      restroomPct:     r.restroom_pct,   restroomNoPct:  r.restroom_no_pct,
      seatingPct:      r.seating_pct,    seatingNoPct:   r.seating_no_pct,
      parkingPct:      r.parking_pct,    parkingNoPct:   r.parking_no_pct,
      avgServicePct:   r.avg_service_pct ?? null,
      hasTeamRating:   r.has_team_rating ?? false,
    }));

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/venues]", message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [venueCount, ratingCount, userCount, recentRatings, topVenues] = await Promise.all([
      prisma.venue.count(),
      prisma.accessibilityRating.count(),
      prisma.profile.count(),
      prisma.accessibilityRating.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          venue:   { select: { name: true } },
          profile: { select: { displayName: true } },
        },
      }),
      prisma.venue.findMany({
        orderBy: { ratings: { _count: "desc" } },
        take: 10,
        include: { _count: { select: { ratings: true } } },
      }),
    ]);

    return NextResponse.json({ venueCount, ratingCount, userCount, recentRatings, topVenues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

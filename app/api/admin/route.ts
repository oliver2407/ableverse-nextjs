import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (profile?.role !== "team") return null;
  return user;
}

export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

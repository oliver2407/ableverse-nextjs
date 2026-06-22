import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { ServiceRating, FacilityRating } from "@prisma/client";

export async function POST(request: Request) {
  try {
    // Verify the user is signed in
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in to submit a review." }, { status: 401 });
    }

    // Ensure user row exists (in case the DB trigger wasn't set up)
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: { id: user.id, email: user.email ?? "" },
    });

    const body = await request.json();
    const { venueSlug, serviceRating, facilityRating, comment, isAnonymous } = body;

    if (!venueSlug || !serviceRating || !facilityRating) {
      return NextResponse.json({ error: "venueSlug, serviceRating and facilityRating are required." }, { status: 400 });
    }

    const validService = ["POOR", "OKAY", "GOOD"].includes(serviceRating);
    const validFacility = ["POOR", "OKAY", "GOOD"].includes(facilityRating);
    if (!validService || !validFacility) {
      return NextResponse.json({ error: "Rating values must be POOR, OKAY, or GOOD." }, { status: 400 });
    }

    // Look up venue by slug
    const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
    if (!venue) {
      return NextResponse.json({ error: `Venue "${venueSlug}" not found in database. Run the venue seed SQL first.` }, { status: 404 });
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        venueId: venue.id,
        userId: isAnonymous ? null : user.id,
        serviceRating: serviceRating as ServiceRating,
        facilityRating: facilityRating as FacilityRating,
        comment: comment?.trim() || null,
        isAnonymous: isAnonymous ?? false,
      },
    });

    // Recalculate aggregated scores
    const allReviews = await prisma.review.findMany({ where: { venueId: venue.id } });
    const ratingToScore = (r: ServiceRating | FacilityRating) =>
      r === "GOOD" ? 90 : r === "OKAY" ? 60 : 30;

    const avgService = Math.round(
      allReviews.reduce((sum, r) => sum + ratingToScore(r.serviceRating), 0) / allReviews.length
    );
    const avgFacility = Math.round(
      allReviews.reduce((sum, r) => sum + ratingToScore(r.facilityRating), 0) / allReviews.length
    );

    await prisma.venue.update({
      where: { id: venue.id },
      data: { scoreService: avgService, scoreFacility: avgFacility },
    });

    return NextResponse.json({ success: true, reviewId: review.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/reviews]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueSlug = searchParams.get("venueSlug");

    if (!venueSlug) {
      return NextResponse.json({ error: "venueSlug query param required." }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found." }, { status: 404 });
    }

    const reviews = await prisma.review.findMany({
      where: { venueId: venue.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        serviceRating: true,
        facilityRating: true,
        comment: true,
        isAnonymous: true,
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/reviews]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

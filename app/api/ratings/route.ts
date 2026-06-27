import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

const VALID = ["yes", "no", "unsure"] as const;
type Answer = (typeof VALID)[number];

function isAnswer(v: unknown): v is Answer {
  return VALID.includes(v as Answer);
}

// POST /api/ratings
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in to submit a rating." }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, entrance, walkwayDoorWidth, accessibleRestroom, tableSeating, parking, photoProofUrl, note } = body;

    if (!venueId) return NextResponse.json({ error: "venueId is required." }, { status: 400 });

    for (const [field, val] of [
      ["entrance", entrance], ["walkwayDoorWidth", walkwayDoorWidth],
      ["accessibleRestroom", accessibleRestroom], ["tableSeating", tableSeating],
      ["parking", parking],
    ]) {
      if (!isAnswer(val)) {
        return NextResponse.json({ error: `"${field}" must be yes, no, or unsure.` }, { status: 400 });
      }
    }

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) return NextResponse.json({ error: "Venue not found." }, { status: 404 });

    const displayName    = (user.user_metadata?.username as string | undefined)?.trim() || (user.user_metadata?.full_name as string | undefined)?.trim() || null;
    const phone          = (user.user_metadata?.phone as string | undefined)?.trim() || null;
    const disabilityType = (user.user_metadata?.disability_type as string | undefined) || null;
    await prisma.profile.upsert({
      where:  { id: user.id },
      update: {},
      create: { id: user.id, displayName, phone, disabilityType, role: "community" },
    });

    const rating = await prisma.accessibilityRating.create({
      data: {
        venueId,
        ratedBy:           user.id,
        raterType:         "community",
        entrance,
        walkwayDoorWidth,
        accessibleRestroom,
        tableSeating,
        parking,
        photoProofUrl:     photoProofUrl || null,
        note:              note?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, id: rating.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/ratings]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/ratings?venueId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    if (!venueId) return NextResponse.json({ error: "venueId required." }, { status: 400 });

    const ratings = await prisma.accessibilityRating.findMany({
      where:   { venueId },
      orderBy: { createdAt: "desc" },
      take:    50,
      include: { profile: { select: { displayName: true, role: true } } },
    });

    return NextResponse.json({ ratings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/ratings]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/ratings?id=xxx
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    const existing = await prisma.accessibilityRating.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rating not found." }, { status: 404 });
    if (existing.ratedBy !== user.id) {
      return NextResponse.json({ error: "You can only edit your own ratings." }, { status: 403 });
    }

    const body = await request.json();
    const { entrance, walkwayDoorWidth, accessibleRestroom, tableSeating, parking, note } = body;

    for (const [field, val] of [
      ["entrance", entrance], ["walkwayDoorWidth", walkwayDoorWidth],
      ["accessibleRestroom", accessibleRestroom], ["tableSeating", tableSeating],
      ["parking", parking],
    ]) {
      if (!isAnswer(val)) {
        return NextResponse.json({ error: `"${field}" must be yes, no, or unsure.` }, { status: 400 });
      }
    }

    await prisma.accessibilityRating.update({
      where: { id },
      data:  { entrance, walkwayDoorWidth, accessibleRestroom, tableSeating, parking, note: note?.trim() || null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[PATCH /api/ratings]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/ratings?id=xxx
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    const existing = await prisma.accessibilityRating.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rating not found." }, { status: 404 });
    if (existing.ratedBy !== user.id) {
      return NextResponse.json({ error: "You can only delete your own ratings." }, { status: 403 });
    }

    await prisma.accessibilityRating.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DELETE /api/ratings]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

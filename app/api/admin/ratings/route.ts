import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const VALID = ["yes", "no", "unsure"] as const;
type Answer = (typeof VALID)[number];
function isAnswer(v: unknown): v is Answer { return VALID.includes(v as Answer); }

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const venueId   = searchParams.get("venueId")   ?? undefined;
  const raterType = searchParams.get("raterType")  ?? undefined;

  const ratings = await prisma.accessibilityRating.findMany({
    where: {
      ...(venueId   && { venueId }),
      ...(raterType && { raterType }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      venue:   { select: { name: true } },
      profile: { select: { displayName: true } },
    },
  });
  const venues = await prisma.venue.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ ratings, venues });
}

// POST — submit a team rating for any venue
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { venueId, entrance, walkwayDoorWidth, accessibleRestroom, tableSeating, parking, note } = await request.json();
  if (!venueId) return NextResponse.json({ error: "venueId required." }, { status: 400 });

  for (const [field, val] of [
    ["entrance", entrance], ["walkwayDoorWidth", walkwayDoorWidth],
    ["accessibleRestroom", accessibleRestroom], ["tableSeating", tableSeating], ["parking", parking],
  ]) {
    if (!isAnswer(val)) return NextResponse.json({ error: `"${field}" must be yes/no/unsure.` }, { status: 400 });
  }

  await prisma.profile.upsert({
    where:  { id: ctx.user.id },
    update: {},
    create: { id: ctx.user.id, role: "team", isAdmin: true },
  });

  const rating = await prisma.accessibilityRating.create({
    data: {
      venueId, ratedBy: ctx.user.id, raterType: "team", verified: true,
      entrance, walkwayDoorWidth, accessibleRestroom, tableSeating, parking,
      note: note?.trim() || null,
    },
  });
  return NextResponse.json({ success: true, id: rating.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  const { verified } = await request.json();
  const rating = await prisma.accessibilityRating.update({ where: { id }, data: { verified } });
  return NextResponse.json({ rating });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  await prisma.accessibilityRating.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

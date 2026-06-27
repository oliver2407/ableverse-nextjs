import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";

  const venues = await prisma.venue.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { ratings: true } } },
  });
  return NextResponse.json({ venues });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, address, lat, lng, category, googlePlaceId, photoUrl } = await request.json();
  if (!name || !address || lat == null || lng == null) {
    return NextResponse.json({ error: "name, address, lat, lng are required." }, { status: 400 });
  }
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json({ error: "lat and lng must be valid numbers." }, { status: 400 });
  }
  const venue = await prisma.venue.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      lat: latNum,
      lng: lngNum,
      category: category ?? "restaurant",
      googlePlaceId: googlePlaceId?.trim() || `manual_${Date.now()}`,
      photoUrl: photoUrl?.trim() || null,
    },
  });
  return NextResponse.json({ venue }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  const { name, address, lat, lng, category, photoUrl } = await request.json();
  const patchLatNum = lat != null ? parseFloat(lat) : null;
  const patchLngNum = lng != null ? parseFloat(lng) : null;
  if ((patchLatNum !== null && isNaN(patchLatNum)) || (patchLngNum !== null && isNaN(patchLngNum))) {
    return NextResponse.json({ error: "lat and lng must be valid numbers." }, { status: 400 });
  }
  const venue = await prisma.venue.update({
    where: { id },
    data: {
      ...(name      && { name:     name.trim()     }),
      ...(address   && { address:  address.trim()  }),
      ...(patchLatNum !== null && { lat: patchLatNum }),
      ...(patchLngNum !== null && { lng: patchLngNum }),
      ...(category  && { category              }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl || null }),
    },
  });
  return NextResponse.json({ venue });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  await prisma.venue.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/**
 * Fetches correct lat/lng from Places API (New) for all venues with a real place_id.
 * Run: npm run fix-locations
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const KEY  = process.env.GOOGLE_PLACES_API_KEY!;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

interface PlaceDetails {
  lat: number;
  lng: number;
  address: string | null;
}

async function fetchDetails(placeId: string): Promise<PlaceDetails | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=location,formattedAddress&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.location) return null;
  return {
    lat: data.location.latitude,
    lng: data.location.longitude,
    address: data.formattedAddress ?? null,
  };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });
  const real = venues.filter((v) => !v.googlePlaceId.startsWith("place_"));
  console.log(`\nFixing lat/lng + address for ${real.length} venues…\n`);

  let updated = 0;
  for (const venue of real) {
    process.stdout.write(`  ${venue.name} … `);
    const details = await fetchDetails(venue.googlePlaceId);
    if (!details) { console.log("failed"); await delay(300); continue; }
    await prisma.venue.update({
      where: { id: venue.id },
      data: { lat: details.lat, lng: details.lng, ...(details.address ? { address: details.address } : {}) },
    });
    console.log(`✓  ${details.address ?? "(no address)"}`);
    updated++;
    await delay(200);
  }
  console.log(`\nDone. ${updated}/${real.length} updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

/**
 * Enriches venue rows that still have placeholder google_place_ids.
 * Uses Places API (New) — must be enabled in Google Cloud Console:
 *   APIs & Services → Library → search "Places API (New)" → Enable
 *
 * Run once: npm run enrich
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const KEY   = process.env.GOOGLE_PLACES_API_KEY!;
const pool  = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Sky Garden centre — biases search results to the right area
const CENTER = { latitude: 10.7313, longitude: 106.7120 };

interface PlaceResult {
  id: string;
  photos?: { name: string }[];
}

async function searchPlace(name: string, address: string): Promise<PlaceResult | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.id,places.photos",
    },
    body: JSON.stringify({
      textQuery: `${name} ${address}`,
      locationBias: { circle: { center: CENTER, radius: 2000.0 } },
      maxResultCount: 1,
    }),

  });

  if (!res.ok) {
    const body = await res.text();
    console.error("  Places search failed:", res.status, body);
    return null;
  }

  const data = await res.json();
  return data.places?.[0] ?? null;
}

async function getPhotoUri(photoName: string): Promise<string | null> {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.photoUri as string) ?? null;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });

  const toEnrich = venues.filter((v) => v.googlePlaceId.startsWith("place_") || v.photoUrl === null);
  console.log(`\nEnriching ${toEnrich.length} venues via Places API (New)…\n`);

  let updated = 0; let notFound = 0; let skipped = 0;

  for (const venue of toEnrich) {
    process.stdout.write(`  ${venue.name} … `);

    const place = await searchPlace(venue.name, venue.address);

    if (!place) {
      console.log("not found");
      notFound++;
      await delay(400);
      continue;
    }

    let photoUrl: string | null = null;
    if (place.photos?.[0]) {
      photoUrl = await getPhotoUri(place.photos[0].name);
      await delay(200);
    }

    try {
      await prisma.venue.update({
        where: { id: venue.id },
        data:  { googlePlaceId: place.id, photoUrl },
      });
      const photoStatus = photoUrl ? "✓ photo" : "no photo";
      console.log(`✓  place_id=${place.id.slice(0, 20)}…  ${photoStatus}`);
      updated++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") {
        console.log(`⚠  duplicate place_id=${place.id.slice(0, 20)}… — skipped`);
        notFound++;
      } else {
        throw e;
      }
    }

    await delay(350);
  }

  const alreadyDone = venues.length - toEnrich.length;
  if (alreadyDone) {
    skipped = alreadyDone;
    console.log(`\n  (${alreadyDone} venue${alreadyDone !== 1 ? "s" : ""} already had real place IDs — skipped)`);
  }

  console.log(`\nDone. ${updated} updated · ${notFound} not found · ${skipped} skipped`);

  if (notFound > 0) {
    console.log("\nVenues not found — verify manually:");
    for (const v of toEnrich) {
      const current = await prisma.venue.findUnique({ where: { id: v.id } });
      if (current?.googlePlaceId.startsWith("place_")) {
        console.log(`  - ${v.name}  (${v.address})`);
      }
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

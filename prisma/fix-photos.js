/**
 * fix-photos.js
 *
 * Finds venues whose photo_url still uses the old maps.googleapis.com format
 * (which embeds the API key and isn't whitelisted for next/image), then
 * fetches a permanent googleusercontent.com URI via Places API (New) and updates the row.
 *
 * Run ONCE after expand-venues finishes:
 *   node prisma/fix-photos.js
 */

require("dotenv").config({ path: ".env.local" });
const fetch = require("node-fetch");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const KEY    = process.env.GOOGLE_PLACES_API_KEY;
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPermamentPhotoUri(placeId, photoReference) {
  const url = `https://places.googleapis.com/v1/places/${placeId}/photos/${photoReference}/media?maxWidthPx=800&skipHttpRedirect=true&key=${KEY}`;
  try {
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

// Extract photo_reference from the old URL format
function extractPhotoRef(oldUrl) {
  try {
    const u   = new URL(oldUrl);
    return u.searchParams.get("photo_reference");
  } catch {
    return null;
  }
}

async function main() {
  if (!KEY) { console.error("Missing GOOGLE_PLACES_API_KEY in .env.local"); process.exit(1); }

  // Find all venues with the old maps.googleapis.com photo URL
  const venues = await prisma.venue.findMany({
    where: { photoUrl: { contains: "maps.googleapis.com" } },
    select: { id: true, name: true, googlePlaceId: true, photoUrl: true },
  });

  console.log(`\nFound ${venues.length} venues with old photo URLs to fix.\n`);
  if (venues.length === 0) { console.log("Nothing to do."); return; }

  let fixed = 0, failed = 0;

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    process.stdout.write(`[${i + 1}/${venues.length}] ${v.name} … `);

    const photoRef = extractPhotoRef(v.photoUrl);
    if (!photoRef) { console.log("could not parse ref — skipped"); failed++; continue; }

    const permanentUrl = await getPermamentPhotoUri(v.googlePlaceId, photoRef);
    if (!permanentUrl) { console.log("no URI returned — cleared"); }

    await prisma.venue.update({
      where: { id: v.id },
      data:  { photoUrl: permanentUrl },
    });

    console.log(permanentUrl ? "✓" : "cleared (no photo)");
    if (permanentUrl) fixed++;
    else failed++;

    await sleep(200);
  }

  console.log(`\n✓ Done — ${fixed} fixed, ${failed} cleared/failed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

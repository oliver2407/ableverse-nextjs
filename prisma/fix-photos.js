/**
 * fix-photos.js
 *
 * Fixes venues that have no photo (photoUrl = null) and have a real Google
 * Place ID. Fetches a permanent googleusercontent.com URI via Places API (New).
 *
 * Run:
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

async function getPhotoUrl(placeId) {
  // Step 1: get the photo name from Places API (New)
  const detailRes = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${KEY}`
  );
  if (!detailRes.ok) return null;
  const detail    = await detailRes.json();
  const photoName = detail.photos?.[0]?.name;
  if (!photoName) return null;

  // Step 2: fetch permanent URI
  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${KEY}`
  );
  if (!mediaRes.ok) return null;
  const media = await mediaRes.json();
  return media.photoUri ?? null;
}

async function main() {
  if (!KEY) { console.error("Missing GOOGLE_PLACES_API_KEY in .env.local"); process.exit(1); }

  // Only target venues with real Place IDs (ChIJ...) and no photo
  const venues = await prisma.venue.findMany({
    where: {
      photoUrl: null,
      NOT: [
        { googlePlaceId: { startsWith: "place_" } },
        { googlePlaceId: { startsWith: "manual_" } },
      ],
    },
    select: { id: true, name: true, googlePlaceId: true },
  });

  console.log(`\nFound ${venues.length} venues with no photo to fix.\n`);
  if (venues.length === 0) { console.log("Nothing to do."); return; }

  let fixed = 0, noPhoto = 0;

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    process.stdout.write(`[${i + 1}/${venues.length}] ${v.name} … `);

    const photoUrl = await getPhotoUrl(v.googlePlaceId);

    if (photoUrl) {
      await prisma.venue.update({ where: { id: v.id }, data: { photoUrl } });
      console.log("✓");
      fixed++;
    } else {
      console.log("no photo available");
      noPhoto++;
    }

    await sleep(200);
  }

  console.log(`\n✓ Done — ${fixed} fixed, ${noPhoto} have no photo on Google.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

/**
 * expand-venues.js
 *
 * Scans the Sky Garden / Phú Mỹ Hưng polygon using Places API (New) —
 * keeps only venues with >10 Google ratings and upserts into Neon via Prisma.
 *
 * Uses Places API (New) throughout so photo URLs are permanent
 * googleusercontent.com links that work with next/image.
 *
 * Run:
 *   npm run expand-venues
 */

require("dotenv").config({ path: ".env.local" });
const fetch = require("node-fetch");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const KEY    = process.env.GOOGLE_PLACES_API_KEY;
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Polygon covering Sky Garden / Phú Mỹ Hưng core area
const POLYGON = [
  { lat: 10.733426, lng: 106.700249 }, // top-left
  { lat: 10.733277, lng: 106.724632 }, // top-right
  { lat: 10.719439, lng: 106.717787 }, // bottom-right
  { lat: 10.720376, lng: 106.701985 }, // bottom-left
];

const MIN_RATINGS   = 10;
const GRID_STEP_KM  = 0.6;
const SEARCH_RADIUS = 500;
const PLACE_TYPES   = ["cafe", "restaurant"];

// Ray-casting point-in-polygon
function insidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

function polygonBbox(polygon) {
  return {
    minLat: Math.min(...polygon.map(p => p.lat)),
    maxLat: Math.max(...polygon.map(p => p.lat)),
    minLng: Math.min(...polygon.map(p => p.lng)),
    maxLng: Math.max(...polygon.map(p => p.lng)),
  };
}

function generateGrid(polygon, stepKm) {
  const bbox    = polygonBbox(polygon);
  const stepLat = stepKm / 111;
  const stepLng = stepKm / (111 * Math.cos((bbox.minLat * Math.PI) / 180));
  const points  = [];
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += stepLat)
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += stepLng)
      if (insidePolygon(lat, lng, polygon))
        points.push({ lat, lng });
  return points;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Places API (New) — Nearby Search
async function nearbySearch(lat, lng, type) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "X-Goog-Api-Key":  KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.userRatingCount,places.photos,places.primaryType",
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: SEARCH_RADIUS,
        },
      },
    }),
  });
  if (!res.ok) {
    console.warn(`  ⚠️  API error ${res.status} at (${lat.toFixed(4)},${lng.toFixed(4)})`);
    return [];
  }
  const data = await res.json();
  return data.places ?? [];
}

// Places API (New) — get permanent photo URI
async function getPhotoUrl(photoName) {
  if (!photoName) return null;
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${KEY}`;
  try {
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

async function upsertVenue(place, category) {
  try {
    const photoUrl = await getPhotoUrl(place.photos?.[0]?.name);
    await prisma.venue.upsert({
      where:  { googlePlaceId: place.id },
      update: {
        name:     place.displayName?.text ?? place.id,
        address:  place.formattedAddress ?? "",
        lat:      place.location.latitude,
        lng:      place.location.longitude,
        photoUrl,
        category,
      },
      create: {
        googlePlaceId: place.id,
        name:          place.displayName?.text ?? place.id,
        address:       place.formattedAddress ?? "",
        lat:           place.location.latitude,
        lng:           place.location.longitude,
        photoUrl,
        category,
      },
    });
    return true;
  } catch (e) {
    console.error(`  ❌ ${place.displayName?.text}: ${e.message}`);
    return false;
  }
}

async function main() {
  if (!KEY) { console.error("Missing GOOGLE_PLACES_API_KEY in .env.local"); process.exit(1); }

  const grid = generateGrid(POLYGON, GRID_STEP_KM);
  console.log(`\nGrid: ${grid.length} points inside polygon (>${MIN_RATINGS} Google ratings filter)\n`);

  const allVenues = new Map();

  for (let i = 0; i < grid.length; i++) {
    const { lat, lng } = grid[i];
    process.stdout.write(`[${i + 1}/${grid.length}] (${lat.toFixed(4)}, ${lng.toFixed(4)}) `);
    for (const type of PLACE_TYPES) {
      const results = await nearbySearch(lat, lng, type);
      const filtered = results.filter(p => (p.userRatingCount ?? 0) > MIN_RATINGS);
      process.stdout.write(`${type}:${filtered.length}/${results.length} `);
      for (const place of filtered)
        if (!allVenues.has(place.id))
          allVenues.set(place.id, { place, category: type });
      await sleep(300);
    }
    console.log();
  }

  console.log(`\nUnique venues with >${MIN_RATINGS} ratings: ${allVenues.size}`);
  console.log("Fetching photos & upserting into Neon…\n");

  let ok = 0, i = 0;
  for (const { place, category } of allVenues.values()) {
    i++;
    process.stdout.write(`  [${i}/${allVenues.size}] ${place.displayName?.text} (${place.userRatingCount} reviews) … `);
    if (await upsertVenue(place, category)) { ok++; console.log("✓"); }
    else console.log("❌");
    await sleep(100);
  }

  console.log(`\n✓ Done — ${ok}/${allVenues.size} venues upserted with real photos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

/**
 * expand-venues.js
 *
 * Scans the Sky Garden / Phú Mỹ Hưng polygon for cafes & restaurants,
 * keeps only venues with >10 Google ratings, and upserts into Neon via Prisma.
 *
 * Safe to re-run — upsert is keyed on google_place_id.
 *
 * Run:
 *   npm run expand-venues
 */

require("dotenv").config({ path: ".env.local" });
const fetch = require("node-fetch");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Polygon covering Sky Garden / Phú Mỹ Hưng core area
const POLYGON = [
  { lat: 10.733426, lng: 106.700249 }, // top-left
  { lat: 10.733277, lng: 106.724632 }, // top-right
  { lat: 10.719439, lng: 106.717787 }, // bottom-right
  { lat: 10.720376, lng: 106.701985 }, // bottom-left
];

const MIN_RATINGS    = 10;   // only venues with >10 Google reviews
const GRID_STEP_KM   = 0.6;  // smaller step for denser coverage inside polygon
const SEARCH_RADIUS  = 500;  // metres
const PLACE_TYPES    = ["cafe", "restaurant"];

// Ray-casting point-in-polygon check
function insidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Bounding box of polygon for grid generation
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

async function nearbySearch(lat, lng, type, pageToken = null) {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
    + `?location=${lat},${lng}&radius=${SEARCH_RADIUS}&type=${type}&key=${GOOGLE_API_KEY}`;
  if (pageToken) url += `&pagetoken=${pageToken}`;
  const res = await fetch(url);
  return res.json();
}

async function searchAllPages(lat, lng, type) {
  let results = [], pageToken = null, page = 0;
  do {
    if (pageToken) await sleep(2000);
    const data = await nearbySearch(lat, lng, type, pageToken);
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn(`  ⚠️  ${data.status} at (${lat.toFixed(4)},${lng.toFixed(4)}) — ${data.error_message || ""}`);
      break;
    }
    if (data.results) results = results.concat(data.results);
    pageToken = data.next_page_token || null;
    page++;
  } while (pageToken && page < 3);
  return results;
}

async function buildPhotoUrl(placeId, photoReference) {
  if (!photoReference) return null;
  const url = `https://places.googleapis.com/v1/places/${placeId}/photos/${photoReference}/media?maxWidthPx=800&skipHttpRedirect=true&key=${GOOGLE_API_KEY}`;
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
    const photoUrl = await buildPhotoUrl(place.place_id, place.photos?.[0]?.photo_reference);
    await prisma.venue.upsert({
      where:  { googlePlaceId: place.place_id },
      update: { name: place.name, address: place.vicinity || "", lat: place.geometry.location.lat, lng: place.geometry.location.lng, photoUrl, category },
      create: { googlePlaceId: place.place_id, name: place.name, address: place.vicinity || "", lat: place.geometry.location.lat, lng: place.geometry.location.lng, photoUrl, category },
    });
    return true;
  } catch (e) {
    console.error(`  ❌ ${place.name}: ${e.message}`);
    return false;
  }
}

async function main() {
  if (!GOOGLE_API_KEY) { console.error("Missing GOOGLE_PLACES_API_KEY in .env.local"); process.exit(1); }

  const grid = generateGrid(POLYGON, GRID_STEP_KM);
  console.log(`\nGrid: ${grid.length} points inside polygon (${MIN_RATINGS}+ Google ratings filter)\n`);

  const allVenues = new Map();

  for (let i = 0; i < grid.length; i++) {
    const { lat, lng } = grid[i];
    process.stdout.write(`[${i + 1}/${grid.length}] (${lat.toFixed(4)}, ${lng.toFixed(4)}) `);
    for (const type of PLACE_TYPES) {
      const results = await searchAllPages(lat, lng, type);
      const filtered = results.filter(p => (p.user_ratings_total ?? 0) > MIN_RATINGS);
      process.stdout.write(`${type}:${filtered.length}/${results.length} `);
      for (const place of filtered)
        if (!allVenues.has(place.place_id))
          allVenues.set(place.place_id, { place, category: type });
      await sleep(300);
    }
    console.log();
  }

  console.log(`\nUnique venues with >${MIN_RATINGS} ratings: ${allVenues.size}`);
  console.log("Upserting into Neon…\n");

  let ok = 0, i = 0;
  for (const { place, category } of allVenues.values()) {
    i++;
    const ratings = place.user_ratings_total ?? 0;
    process.stdout.write(`  [${i}/${allVenues.size}] ${place.name} (${ratings} reviews) … `);
    if (await upsertVenue(place, category)) { ok++; console.log("✓"); }
    else console.log("❌");
  }

  console.log(`\n✓ Done — ${ok}/${allVenues.size} venues upserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

/**
 * expand-venues.js
 *
 * Discovers cafes & restaurants across all of District 7 (Quận 7)
 * using a grid of Google Places Nearby Search calls, then dedupes
 * and upserts new venues into Neon (via Prisma).
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

// Bounding box for all of Quận 7, HCMC
const BBOX = {
  minLat: 10.69,
  maxLat: 10.765,
  minLng: 106.68,
  maxLng: 106.755,
};

const GRID_STEP_KM  = 1.2;
const SEARCH_RADIUS = 800; // metres — slight overlap between cells
const PLACE_TYPES   = ["cafe", "restaurant"];

function generateGrid(bbox, stepKm) {
  const stepLat = stepKm / 111;
  const stepLng = stepKm / (111 * Math.cos((bbox.minLat * Math.PI) / 180));
  const points  = [];
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += stepLat)
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += stepLng)
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
      console.warn(`  ⚠️  ${data.status} at (${lat.toFixed(4)},${lng.toFixed(4)}) type=${type} — ${data.error_message || ""}`);
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
  // Use Places API (New) to get a permanent googleusercontent.com URI
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
      update: {
        name:     place.name,
        address:  place.vicinity || place.formatted_address || "",
        lat:      place.geometry.location.lat,
        lng:      place.geometry.location.lng,
        photoUrl,
        category,
      },
      create: {
        googlePlaceId: place.place_id,
        name:          place.name,
        address:       place.vicinity || place.formatted_address || "",
        lat:           place.geometry.location.lat,
        lng:           place.geometry.location.lng,
        photoUrl,
        category,
      },
    });
    return true;
  } catch (e) {
    console.error(`  ❌ ${place.name}: ${e.message}`);
    return false;
  }
}

async function main() {
  if (!GOOGLE_API_KEY) { console.error("Missing GOOGLE_PLACES_API_KEY in .env.local"); process.exit(1); }

  const grid = generateGrid(BBOX, GRID_STEP_KM);
  console.log(`\nGrid: ${grid.length} points across Quận 7\n`);

  const allVenues = new Map();

  for (let i = 0; i < grid.length; i++) {
    const { lat, lng } = grid[i];
    console.log(`[${i + 1}/${grid.length}] (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    for (const type of PLACE_TYPES) {
      const results = await searchAllPages(lat, lng, type);
      console.log(`  ${type}: ${results.length}`);
      for (const place of results)
        if (!allVenues.has(place.place_id))
          allVenues.set(place.place_id, { place, category: type });
      await sleep(300);
    }
  }

  console.log(`\nUnique venues found: ${allVenues.size}`);
  console.log("Upserting into Neon via Prisma…\n");

  let ok = 0, i = 0;
  for (const { place, category } of allVenues.values()) {
    i++;
    if (await upsertVenue(place, category)) ok++;
    if (i % 20 === 0) console.log(`  ${i}/${allVenues.size} processed`);
  }

  console.log(`\n✓ Done — ${ok}/${allVenues.size} venues upserted into Neon.`);
  console.log("New venues have no ratings yet — they'll show as unrated in the app.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

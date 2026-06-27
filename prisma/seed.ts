import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 35 pilot venues — Phú Mỹ Hưng / Sky Garden, District 7, HCMC
// google_place_id: placeholder until Google Places API key is wired up
const VENUES = [
  // ── Restaurants (20) ────────────────────────────────────────────────────
  { id: "place_r01", name: "A Mìn Quán – Phú Mỹ Hưng",            address: "Số 8 Đường số 6, Khu Hưng Vượng 2, Quận 7",          lat: 10.7343, lng: 106.7118, category: "restaurant" },
  { id: "place_r02", name: "SAMWON BBQ Quận 7",                     address: "49/R1-49 Hưng Gia 3, Phú Mỹ Hưng, Quận 7",          lat: 10.7330, lng: 106.7115, category: "restaurant" },
  { id: "place_r03", name: "Hải Sản Hoàng Gia",                     address: "46–48 Phạm Văn Nghị, Hưng Gia 4, Quận 7",           lat: 10.7315, lng: 106.7122, category: "restaurant" },
  { id: "place_r04", name: "Truyền Thuyết ChamPong Quận 7",         address: "93 Phạm Văn Nghị, Tân Phong, Quận 7",               lat: 10.7308, lng: 106.7125, category: "restaurant" },
  { id: "place_r05", name: "Soumaki Quận 7",                        address: "Nguyễn Văn Linh, Tân Phong, Quận 7",                lat: 10.7290, lng: 106.7108, category: "restaurant" },
  { id: "place_r06", name: "SoFung Korean Restaurant",              address: "S50-2/S33-2 Sky Garden 3, Nguyễn Đổng Chi, Quận 7", lat: 10.7302, lng: 106.7120, category: "restaurant" },
  { id: "place_r07", name: "OK Chicken – Sky Garden 3",             address: "S57-2 Khu Sky Garden 3, Phạm Văn Nghị, Quận 7",     lat: 10.7298, lng: 106.7118, category: "restaurant" },
  { id: "place_r08", name: "Katsuya Vietnam",                       address: "S29-1 Sky Garden 1, Phạm Văn Nghị, Quận 7",         lat: 10.7320, lng: 106.7119, category: "restaurant" },
  { id: "place_r09", name: "Bảo Bối & Bảo Vật",                    address: "70 Phạm Văn Nghị, Sky Garden, Quận 7",              lat: 10.7313, lng: 106.7121, category: "restaurant" },
  { id: "place_r10", name: "Kitchen 3F",                            address: "14 Phạm Văn Nghị, Sky Garden 3, Quận 7",            lat: 10.7306, lng: 106.7118, category: "restaurant" },
  { id: "place_r11", name: "Mr. Kiss",                              address: "S43-R2 Phạm Văn Nghị, Sky Garden 2, Quận 7",       lat: 10.7312, lng: 106.7120, category: "restaurant" },
  { id: "place_r12", name: "Shin Po Cha",                           address: "15 Phạm Văn Nghị, Tân Phong, Quận 7",              lat: 10.7307, lng: 106.7119, category: "restaurant" },
  { id: "place_r13", name: "Nhà Hàng Oh",                          address: "S79/S83 Sky Garden 3, Phạm Văn Nghị, Quận 7",      lat: 10.7299, lng: 106.7121, category: "restaurant" },
  { id: "place_r14", name: "Cơm Tấm Sky Garden",                   address: "SA26-2 Sky Garden 2, Phạm Văn Nghị, Quận 7",       lat: 10.7316, lng: 106.7122, category: "restaurant" },
  { id: "place_r15", name: "Phở Nga – Sky Garden",                 address: "S48-2 Sky Garden 3, Phạm Văn Nghị, Quận 7",        lat: 10.7301, lng: 106.7120, category: "restaurant" },
  { id: "place_r16", name: "KFC – Phạm Văn Nghị",                 address: "60 Phạm Văn Nghị, Sky Garden 2, Quận 7",            lat: 10.7310, lng: 106.7121, category: "restaurant" },
  { id: "place_r17", name: "Lotteria – Sky Garden",                address: "76 Phạm Văn Nghị, Tân Phong, Quận 7",               lat: 10.7311, lng: 106.7123, category: "restaurant" },
  { id: "place_r18", name: "Pizza Hut – Sky Garden 1",             address: "Sky Garden 1, Nguyễn Văn Linh, Quận 7",             lat: 10.7295, lng: 106.7108, category: "restaurant" },
  { id: "place_r19", name: "Nhà Hàng Chay An & Cafe",             address: "S62-1 Sky Garden 2, Phạm Văn Nghị, Quận 7",        lat: 10.7309, lng: 106.7120, category: "restaurant" },
  { id: "place_r20", name: "Bollywood Indian Cuisine",             address: "SA26-2 Sky Garden 2, Phạm Văn Nghị, Quận 7",       lat: 10.7317, lng: 106.7122, category: "restaurant" },
  // ── Cafes (15) ──────────────────────────────────────────────────────────
  { id: "place_c01", name: "Cộng Cà Phê – Hưng Vượng 3",          address: "Shop S2-1, Lô R16-2, Hưng Vượng 3, Quận 7",        lat: 10.7338, lng: 106.7116, category: "cafe" },
  { id: "place_c02", name: "The Coffee House – Sky Garden",        address: "Lô R1-72, R4-71 Sky Garden, Hưng Phước 3, Quận 7", lat: 10.7325, lng: 106.7118, category: "cafe" },
  { id: "place_c03", name: "The Coffee Bean & Tea Leaf – Sky Garden", address: "Tầng trệt R1-72 Phạm Văn Nghị, Quận 7",        lat: 10.7326, lng: 106.7119, category: "cafe" },
  { id: "place_c04", name: "Phúc Long – Sky Garden",              address: "34 Phạm Văn Nghị, Tân Phong, Quận 7",              lat: 10.7322, lng: 106.7118, category: "cafe" },
  { id: "place_c05", name: "Cafe Forest",                         address: "1016/36 Phạm Văn Nghị, Sky Garden 2, Quận 7",      lat: 10.7309, lng: 106.7119, category: "cafe" },
  { id: "place_c06", name: "NAVIDO Coffee – Sky Garden 3",        address: "Cổng ô tô Sky Garden 3, Nguyễn Đổng Chi, Quận 7",  lat: 10.7300, lng: 106.7117, category: "cafe" },
  { id: "place_c07", name: "Coffee Real",                         address: "S37-2 Sky Garden 3, Phạm Văn Nghị, Quận 7",        lat: 10.7303, lng: 106.7119, category: "cafe" },
  { id: "place_c08", name: "ZZiN Cafe",                           address: "S54-2 Sky Garden 3, Phạm Văn Nghị, Quận 7",        lat: 10.7301, lng: 106.7121, category: "cafe" },
  { id: "place_c09", name: "Every Half Coffee Roasters",          address: "Số 48 Đường nội khu Hưng Gia II, Quận 7",          lat: 10.7332, lng: 106.7112, category: "cafe" },
  { id: "place_c10", name: "ROCH French Bakery – Sky Garden 3",  address: "28 Phạm Văn Nghị, Tân Phong, Quận 7",              lat: 10.7318, lng: 106.7117, category: "cafe" },
  { id: "place_c11", name: "Paris Baguette – Sky Garden",        address: "Sky Garden 2, Phạm Văn Nghị Bắc, Quận 7",          lat: 10.7314, lng: 106.7119, category: "cafe" },
  { id: "place_c12", name: "Seol Hwa Bingsu",                    address: "28/1 Phạm Văn Nghị, Sky Garden 1, Quận 7",         lat: 10.7321, lng: 106.7116, category: "cafe" },
  { id: "place_c13", name: "Mommy – Trà sữa & Ăn vặt",          address: "SA18-2 Sky Garden 2, Phạm Văn Nghị, Quận 7",       lat: 10.7316, lng: 106.7120, category: "cafe" },
  { id: "place_c14", name: "Timedo Sky Garden 1",                address: "SB3-2 Sky Garden 1, Phạm Văn Nghị, Quận 7",        lat: 10.7323, lng: 106.7117, category: "cafe" },
  { id: "place_c15", name: "Aceline Bakery",                     address: "S85-1 Sky Garden 3, Phạm Văn Nghị, Quận 7",        lat: 10.7297, lng: 106.7122, category: "cafe" },
];

async function main() {
  // 1. Create CHECK constraints idempotently
  console.log("Setting up CHECK constraints…");
  await prisma.$executeRaw`
    DO $$ BEGIN
      BEGIN ALTER TABLE accessibility_ratings ADD CONSTRAINT chk_entrance           CHECK (entrance            IN ('yes','no','unsure')); EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TABLE accessibility_ratings ADD CONSTRAINT chk_walkway            CHECK (walkway_door_width  IN ('yes','no','unsure')); EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TABLE accessibility_ratings ADD CONSTRAINT chk_restroom           CHECK (accessible_restroom IN ('yes','no','unsure')); EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TABLE accessibility_ratings ADD CONSTRAINT chk_seating            CHECK (table_seating       IN ('yes','no','unsure')); EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TABLE accessibility_ratings ADD CONSTRAINT chk_parking            CHECK (parking             IN ('yes','no','unsure')); EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$
  `;

  // 2. Create summary view (idempotent)
  console.log("Creating venue_accessibility_summary view…");
  await prisma.$executeRaw`DROP VIEW IF EXISTS venue_accessibility_summary`;
  await prisma.$executeRaw`
    CREATE VIEW venue_accessibility_summary AS
    SELECT
      venue_id,
      count(*)::int AS total_ratings,
      coalesce(round(100.0 * count(*) FILTER (WHERE entrance            = 'yes') / nullif(count(*) FILTER (WHERE entrance            IN ('yes','no')), 0))::int, 0) AS entrance_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE entrance            = 'no')  / nullif(count(*) FILTER (WHERE entrance            IN ('yes','no')), 0))::int, 0) AS entrance_no_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE walkway_door_width  = 'yes') / nullif(count(*) FILTER (WHERE walkway_door_width  IN ('yes','no')), 0))::int, 0) AS walkway_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE walkway_door_width  = 'no')  / nullif(count(*) FILTER (WHERE walkway_door_width  IN ('yes','no')), 0))::int, 0) AS walkway_no_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE accessible_restroom = 'yes') / nullif(count(*) FILTER (WHERE accessible_restroom IN ('yes','no')), 0))::int, 0) AS restroom_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE accessible_restroom = 'no')  / nullif(count(*) FILTER (WHERE accessible_restroom IN ('yes','no')), 0))::int, 0) AS restroom_no_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE table_seating       = 'yes') / nullif(count(*) FILTER (WHERE table_seating       IN ('yes','no')), 0))::int, 0) AS seating_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE table_seating       = 'no')  / nullif(count(*) FILTER (WHERE table_seating       IN ('yes','no')), 0))::int, 0) AS seating_no_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE parking             = 'yes') / nullif(count(*) FILTER (WHERE parking             IN ('yes','no')), 0))::int, 0) AS parking_pct,
      coalesce(round(100.0 * count(*) FILTER (WHERE parking             = 'no')  / nullif(count(*) FILTER (WHERE parking             IN ('yes','no')), 0))::int, 0) AS parking_no_pct,
      round(avg(service_rating) * 20)::int AS avg_service_pct,
      bool_or(verified) AS has_team_rating
    FROM accessibility_ratings
    GROUP BY venue_id
  `;

  // 3. Seed venues
  console.log("\nSeeding 35 venues…");
  for (const v of VENUES) {
    await prisma.venue.upsert({
      where:  { googlePlaceId: v.id },
      update: { name: v.name, address: v.address, lat: v.lat, lng: v.lng, category: v.category },
      create: { googlePlaceId: v.id, name: v.name, address: v.address, lat: v.lat, lng: v.lng, category: v.category },
    });
    console.log(`  ✓ ${v.name}`);
  }

  console.log("\nDone. Next step: wire up Google Places API to replace placeholder google_place_ids and fetch real photos.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

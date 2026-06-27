/**
 * Creates 3 admin (team) accounts in Supabase + profiles table.
 * Run once: npm run create-admins
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ADMINS = [
  { email: "admin1@ableverse.vn", password: "Ableverse@2026", username: "admin1", fullName: "Admin One"   },
  { email: "admin2@ableverse.vn", password: "Ableverse@2026", username: "admin2", fullName: "Admin Two"   },
  { email: "admin3@ableverse.vn", password: "Ableverse@2026", username: "admin3", fullName: "Admin Three" },
];

async function main() {
  console.log("\nCreating 3 admin accounts…\n");

  for (const admin of ADMINS) {
    process.stdout.write(`  ${admin.email} … `);

    const { data, error } = await supabase.auth.admin.createUser({
      email:          admin.email,
      password:       admin.password,
      email_confirm:  true,
      user_metadata:  { full_name: admin.fullName, username: admin.username },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log("already exists — skipped");
      } else {
        console.log(`ERROR: ${error.message}`);
      }
      continue;
    }

    await prisma.profile.upsert({
      where:  { id: data.user.id },
      update: { role: "team", displayName: admin.username },
      create: { id: data.user.id, displayName: admin.username, role: "team" },
    });

    console.log(`✓  uid=${data.user.id.slice(0, 8)}…`);
  }

  console.log("\nDone.\n");
  console.log("Credentials:");
  for (const a of ADMINS) {
    console.log(`  ${a.email}  /  ${a.password}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });

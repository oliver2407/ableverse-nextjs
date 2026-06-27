import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const profiles = await prisma.profile.findMany({
    select: { id: true, displayName: true, role: true, isAdmin: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("All profiles:", JSON.stringify(profiles, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main();

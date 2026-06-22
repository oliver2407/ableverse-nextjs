import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import { resolve } from "path";

// Prisma CLI doesn't load .env.local automatically (Next.js does).
// Load it here so DATABASE_URL is available during migrations.
config({ path: resolve(process.cwd(), ".env.local") });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

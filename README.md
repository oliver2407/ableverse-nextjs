# Ableverse

Crowdsourced wheelchair and disability accessibility ratings for cafes and restaurants in Ho Chi Minh City, Vietnam. Built as an MVP focused on the District 7 / Sky Garden / Phú Mỹ Hưng area.

## Features

- Browse venues with accessibility scores across 5 categories: step-free entrance, walkway/door width, accessible restroom, accessible seating, and accessible parking
- Submit and edit your own accessibility rating per venue (one per user per venue)
- Optional photo proof upload and service rating (1–5 stars) with each submission
- Filter by category (cafe / restaurant), distance from your location, and sort by any accessibility metric
- Load-more pagination — all filtering and sorting happens client-side after a single fetch
- Team-verified badge on ratings submitted by Ableverse staff
- Admin dashboard to manage venues and users
- WCAG 2.2 AA compliant — keyboard navigation, skip-to-content, screen-reader live regions, focus trapping in modals

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, `"use client"` components) |
| Database | Neon (PostgreSQL) via Prisma 7 + `@prisma/adapter-pg` |
| Auth | Supabase Auth (email/password, PKCE flow) |
| Storage | Supabase Storage (photo proof uploads) |
| Venue data | Google Places API (New) |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database
- A [Supabase](https://supabase.com) project (auth + storage only — all app data lives in Neon)
- A Google Cloud project with **Places API (New)** enabled

### Environment variables

Create `.env.local` in the project root:

```env
# Neon (Prisma)
DATABASE_URL=postgresql://...

# Supabase Auth + Storage
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Places API (New)
GOOGLE_PLACES_API_KEY=AIza...
```

### Install and run

```bash
npm install
npx prisma db push        # create tables from schema
npm run seed              # seed initial venues
npm run dev               # http://localhost:3000
```

## Database

Schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma). Three models:

- **Venue** — cached from Google Places API; includes `google_place_id`, coordinates, photo URL, category
- **Profile** — extends Supabase `auth.users`; stores display name, role (`team` / `community`), admin flag, ban flag
- **AccessibilityRating** — one per user per venue (`@@unique([venueId, ratedBy])`); the 5-item checklist answers (`yes` / `no` / `unsure`), optional note, service rating, and photo proof URL

A PostgreSQL view `venue_accessibility_summary` aggregates ratings into per-category percentages. It is joined in the venues API route and never queried directly by Prisma Client.

> This project uses `prisma db push` (not `prisma migrate`). There is no migration history. Run `npx prisma db push` after any schema change.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | `prisma generate && next build` |
| `npm run seed` | Seed initial 35 curated venues |
| `npm run enrich` | Fetch real Place IDs + photos for placeholder venues via Places API text search |
| `npm run expand-venues` | Grid-scan District 7 polygon via Places API Nearby Search; upsert venues with >10 Google ratings |
| `npm run fix-photos` | Patch venues that have a real Place ID but a null photo URL |
| `npm run create-admins` | Provision admin accounts |

## Venue Data Pipeline

1. **Seed** — `prisma/seed.ts` inserts ~35 manually curated venues with placeholder `place_XXX` IDs
2. **Enrich** — `prisma/enrich-venues.ts` uses Places API text search to replace placeholder IDs with real `ChIJ…` IDs and fetches photos
3. **Expand** — `prisma/expand-venues.js` grid-scans the Sky Garden polygon via Places API Nearby Search, keeping only venues with >10 Google ratings, and upserts them with permanent `lh3.googleusercontent.com` photo URLs

All photo fetching uses **Places API (New)** with `skipHttpRedirect=true` to get permanent `googleusercontent.com` URIs compatible with `next/image`.

## Auth Flow

- Sign-up / sign-in: Supabase email + password
- Password reset: user enters email on the sign-in page → Supabase sends a reset link → user lands on `/reset-password` → enters new password → redirected to sign-in
- Sign-out: `window.location.href = "/"` (avoids a router race condition)

## Admin

Admins access `/admin` to add/edit/delete venues and manage user accounts (ban / unban, role change). Set `is_admin = true` on a `profiles` row or run `npm run create-admins`.

## Deployment

Deployed to Vercel connected to the `oliver2407/ableverse-nextjs` GitHub repository.

**Supabase configuration required:**

- Authentication → URL Configuration → **Redirect URLs**: add `https://<your-domain>/reset-password`
- Authentication → Providers → Email: disable "Confirm email" for frictionless MVP onboarding, or set the confirmation redirect URL to the live Vercel domain

**Vercel**: set all four `.env.local` variables in the Vercel project environment settings before deploying.

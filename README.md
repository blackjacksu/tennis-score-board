# TAA Tennis Tournament Score Tracker

Live-score website for a 3-team doubles tournament (Team A / B / C, 8 doubles lines per team, round-robin ties). Spectators scan a QR code and watch scores update in real time; tournament staff unlock admin mode with a PIN to report scores.

- **Viewer mode** (`/`) — live match scores + team standings, updates in real time, no login
- **Admin mode** (`/admin`) — PIN-protected score reporting
- **QR codes** (`/qr`) — print-ready QR codes for both modes
- Bilingual UI: 繁體中文 / English

**Stack:** Next.js 15 (App Router) + Tailwind CSS, hosted on Vercel. Supabase (Postgres + Realtime) for data and live updates. Free tier comfortably handles ~100 concurrent viewers.

## 1. Set up Supabase (one time, ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor → New query**:
   - paste and run `supabase/schema.sql`
   - then paste and run `supabase/seed.sql` (3 teams, 8 lines, 24 matches — edit names/labels to taste)
3. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

## 2. Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the Supabase values + choose an ADMIN_PIN
npm run dev
```

Open http://localhost:3000 (viewer) and http://localhost:3000/admin (admin, enter your PIN).

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), **Add New → Project**, import the repo (defaults are fine).
3. Under **Environment Variables**, add the four values from `.env.local.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PIN`
4. Deploy. Your site is live at `https://<project>.vercel.app`.
5. Visit `/qr` on the deployed site and print the page — one QR for spectators, one for staff.

## How it works

- The browser reads scores with the public `anon` key; Row Level Security makes that key **read-only**.
- Score updates go through a Next.js server action that checks the admin cookie (set after PIN login) and writes with the secret `service_role` key.
- Viewers hold a Supabase Realtime (WebSocket) subscription on the `matches` table, so every phone updates the moment a score is saved — no refresh needed.

## Tournament structure

- 3 teams, ~16 players each → 8 doubles pairs ("lines") per team, e.g. two lines per NTRP level (3.0 / 3.5 / 4.0 / 4.5)
- Round-robin ties: A vs B, A vs C, B vs C → each line plays its counterpart → **24 matches**
- Each match is a single games-based set (e.g. 8–5)
- Lines live in the `lines` table — relabel them in Supabase anytime without touching code

## Customizing

| What | Where |
|---|---|
| Team names / colors | `teams` table (Supabase → Table Editor) |
| Line labels / NTRP levels | `lines` table |
| Pair (player) names shown on match cards | `matches.pair_a` / `matches.pair_b` |
| Admin PIN | `ADMIN_PIN` env var |
| UI text / translations | `lib/i18n.tsx` |

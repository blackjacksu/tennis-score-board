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
   - and, for the extra tabs: `supabase/matchmaking.sql` (**Find a Game**) and
     `supabase/gallery.sql` (**Gallery**) — both described below
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
3. Under **Environment Variables**, add the values from `.env.local.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PIN`,
   and optionally `ANTHROPIC_API_KEY` for the Find a Game tab
4. Deploy. Your site is live at `https://<project>.vercel.app`.
5. Visit `/qr` on the deployed site and print the page — one QR for spectators, one for staff.

## How it works

- The browser reads scores with the public `anon` key; Row Level Security makes that key **read-only**.
- Score updates go through a Next.js server action that checks the admin cookie (set after PIN login) and writes with the secret `service_role` key.
- Viewers hold a Supabase Realtime (WebSocket) subscription on the `matches` table, so every phone updates the moment a score is saved — no refresh needed.

## Find a Game (matchmaking tab)

A fourth tab on the viewer board where players post a pickup game in plain
language — *"anyone want to play doubles Thursday 6-8pm in Boston? I'm 3.5"* —
and get matched with everyone whose request fits.

- **Setup:** run `supabase/matchmaking.sql`, and set `ANTHROPIC_API_KEY`.
- **Parsing:** a server action sends the text to Claude with a JSON schema and
  gets back day, time window, town, format, and NTRP. Without an API key it
  falls back to a keyword parser in `lib/matchmaking.ts` — less accurate, still
  usable, and the tab works either way.
- **Matching:** pure functions in `lib/matchmaking.ts`, covered by
  `lib/matchmaking.test.ts`. A missing field means "flexible" and matches
  anything; a *conflicting* field (different town, different day, singles vs
  doubles, no overlapping hours on a shared day) excludes the pair outright
  rather than ranking it low.
- **Handing off to Messenger / Instagram / WhatsApp / SMS:** the app opens the
  right thread in the player's own app with the introduction written, and they
  press send. It does **not** send on their behalf — Meta and the carriers all
  prohibit business-initiated messages to people who haven't opted in, which
  would need Business verification and App Review. WhatsApp and SMS accept
  prefilled text; Instagram and Messenger only accept a destination, so those
  get a copy button. `lib/relay.ts` is the seam where a server-side send would
  slot in if you ever get those approvals.
- Contact handles posted here are **public on the board** — the composer says so.

## Gallery

A fifth tab showing photos from the event. **Read-only for everyone.** Staff
add and remove photos from the admin board at `/admin/photos`, reached from the
score-reporting page.

- **Setup:** run `supabase/gallery.sql`. It creates the public `event-photos`
  Storage bucket *and* the `event_photos` metadata table — no extra env vars.
- **Staff-only writes**, gated on the same admin PIN session as score
  reporting. Enforced in two places that both have to hold: the `/admin/photos`
  route redirects to the PIN form, and every server action in
  `app/gallery/actions.ts` re-checks `isAdmin()` before doing anything. The
  route guard is the convenience; the action check is the control.
- **Uploads bypass the app server.** A Next.js server action body is capped far
  below a phone photo, so the server mints a single-use signed upload URL and
  the browser PUTs the file straight to Storage, then records the row. The anon
  key never needs write access to the bucket, and the signed token is scoped to
  one object — a leaked ticket can write that path and nothing else.
- **Photos are downscaled in the browser** to 1600px on the long edge before
  they're sent — a 5.5 MB phone photo lands at roughly 25 KB, which is the
  difference between an upload that finishes on venue wifi and one that
  doesn't. Going through a canvas also strips EXIF, including GPS.
- The bucket is **public**: any photo URL works for anyone who has it. That's
  what makes thumbnails load without signing every one, and it's the tradeoff
  to know about before pointing a QR code at this tab.

## Tournament structure

- 3 teams, ~16 players each → 8 doubles pairs ("lines") per team, e.g. two lines per NTRP level (3.0 / 3.5 / 4.0 / 4.5)
- Round-robin ties: A vs B, A vs C, B vs C → each line plays its counterpart → **24 matches**
- Each match is a single 6-game set (won 6-0…6-4, 7-5, or 7-6); the admin rejects any other score
- Lines live in the `lines` table — relabel them in Supabase anytime without touching code

## Printable materials

`scripts/print/` generates print-ready PDFs straight from `lib/demoData.ts` — the
same roster the Teams view reads. Whenever the roster changes, re-run the
generators and the PDFs update to match; nothing is hand-edited.

```bash
npm run gen:signin  # signin-sheet.pdf   — one page per team, check-in + signature
npm run gen:poster  # schedule-poster.pdf — 18×24in portrait wall poster: team format + full schedule
npm run gen:print   # both
```

Both scripts need a Unicode/CJK font on the machine to render Chinese names
(they auto-detect common macOS/Linux fonts; set `FONT_PATH=/path/to/font.ttf`
if none are found). Output files are gitignored — regenerate them locally or
in CI rather than committing the PDFs.

## Database seed

`supabase/seed.sql` and `supabase/players_import.sql` are **generated** from the
same `lib/demoData.ts` roster — never hand-edit them:

```bash
npm run gen:seed    # rewrites both files from lib/demoData.ts
```

Change the roster in `demoData.ts`, run `gen:seed`, then paste the two files into
the Supabase SQL Editor (after `schema.sql`). This keeps the live database, the
Teams view, and the printed materials all reading from one source, so a change
like moving a player can't land in one place but not another.

## Customizing

| What | Where |
|---|---|
| Team names / colors | `teams` table (Supabase → Table Editor) |
| Line labels / NTRP levels | `lines` table |
| Pair (player) names shown on match cards | `matches.pair_a` / `matches.pair_b` |
| Admin PIN | `ADMIN_PIN` env var |
| UI text / translations | `lib/i18n.tsx` |

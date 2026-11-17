# CartWise

**Plan the day. Prove the income.** A Malayalam-first, installable PWA for street vendors: sell by tap, bill or voice, take UPI payments by QR, get tomorrow's buy list with reasons (read aloud), see real profit and waste, keep payment records, share a proof-of-income statement, and ask an AI assistant. The product name lives in one constant: [config/brand.ts](config/brand.ts).

> Demo numbers are **synthetic seed data**, never measured field results. The Money page tags seeded numbers as demo data.

## Roles

| Role | What they do |
| --- | --- |
| **Vendor** | Onboarding, Today, Sell (bill, UPI QR, voice), Plan, Money, Payments, Products, Income proof, Notices, Settings |
| **Admin** (platform, created by seed) | Overview KPIs, publish notices, registration assist (simulated), anonymised CSV export |
| **Public** (no login) | Find vendors (`/vendors`, ranked by trust score), vendor profiles, shared income statements (`/p/[token]`), the chat assistant |

## Run locally

```bash
npm install
cp .env.example .env.local        # fill in the Supabase, DB and (optional) Groq values
npm run db:deploy                 # apply prisma/migrations (tables + RLS deny-all)
npm run db:seed                   # 3 vendors x 28-32 days, admin, 5 notices, payment records
npm run dev                       # http://localhost:3000   API docs: /api/docs
```

After changing `prisma/schema.prisma` run `npx prisma generate`. **Stop `next dev` first**: on Windows the running server locks the Prisma engine file (`EPERM`).

Demo logins (when `DEMO_MODE=true`): buttons on `/` and `/login`. Vendor `vendor@demo.cartwise.app` / `Demo-Vendor-2026`; admin `admin@demo.cartwise.app` / `Demo-Admin-2026`.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: creates users, seed |
| `DATABASE_URL` | Pooled Postgres (`pgbouncer=true&connection_limit=5&pool_timeout=30&connect_timeout=30`) for runtime |
| `DIRECT_URL` | Direct/session Postgres for migrations |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | Base URL for share links and OG |
| `DEMO_MODE` | `true` shows the demo login buttons |
| `GROQ_API_KEY` | Voice transcription (Whisper) and the chat assistant. Optional: without it, tap entry still works and the assistant says it is unavailable |
| `CHAT_MODEL` | Optional. Chat model, default `llama-3.3-70b-versatile` |

## Features

- **Sell**: tap a product, pick the quantity in a bottom popup, add several, **Collect** as Cash or **UPI** (QR for the exact amount from the vendor's UPI ID; the app never touches the money). Undo for a few seconds.
- **Voice assistant**: tap the mic, say "2 kg mango, 3 banana". The recording is transcribed (Whisper via Groq, Malayalam or English), matched to the vendor's products and put on the bill. Audio is not stored.
- **Close day**: one tap on Today. Numbers are *derived* from the day's sales and the plan (bought = plan quantity, leftover = bought - sold, sold out = sold >= plan, cost = bought x buy price). Earlier unclosed days are closed automatically. Limit: a derived day looks as if the plan was followed.
- **Plan**: newsvendor forecast on the last 8 closed days with reasons, ranges, overrides and read-aloud. Constants in [server/config/constants.ts](server/config/constants.ts).
- **Money / Payments**: profit, waste and missed sales with a before-after card; every bill with its products, time and method.
- **Income proof**: statement from the vendor's own records, private expiring share link (token hash stored, shown once, revocable), indicative loan checklist. Not official eligibility.
- **Public vendor list**: opt-in. Vendors are ranked by a trust score (days of records, closing days, steady sales, low waste). Income is never shown. [server/services/reliability.ts](server/services/reliability.ts)
- **Assistant (RAG)**: floating chat on every page. Retrieval is BM25 over a bilingual knowledge base ([server/knowledge/kb.ts](server/knowledge/kb.ts), [server/services/rag.ts](server/services/rag.ts)) plus a read-only snapshot of the signed-in vendor's own data; answered by a Groq-hosted LLM and limited to that context. No embedding provider is configured, so retrieval is lexical.
- **Location**: "Use my current location" in onboarding. Waits for a GPS-quality fix, reverse-geocodes on the server (OpenStreetMap Nominatim, coordinates rounded, nothing stored), warns when the fix is approximate.
- **Offline PWA**: service worker ([public/sw.js](public/sw.js)) caches the app shell and warms the main screens; navigations fall back to cache and then [public/offline.html](public/offline.html). Sales and close-day go to an IndexedDB queue and sync with retry (idempotent on `client_id`). The service worker only registers in a production build over HTTPS or localhost. Install from the More page.
- **UI**: Malayalam default with an English toggle (all text via `t()`, [messages/](messages)), themes Light / Dark / Sunlight, text size, mobile-first with a desktop left sidebar.

## Architecture

```
Browser (React, TanStack Query, IndexedDB queue + cache, service worker)
   |  fetch /api/v1/*   { data } | { error: { code, message } }
   v
app/api/v1/**/route.ts      thin: route() wrapper = guard -> rate limit -> Zod parse -> handler
   v
server/services/*           business rules; pure logic in forecast.ts money.ts passport.ts reliability.ts rag.ts
   v
server/repositories/*       Prisma only
   v
Supabase Postgres (RLS deny-all)      Supabase Auth (role in app_metadata: vendor | admin)
shared/schemas (Zod, server + client + OpenAPI)      shared/voice.ts (voice text -> sale lines)
```

- **Auth**: Supabase Auth, email + password for every role. One guard `requireRole()` in [server/lib/auth.ts](server/lib/auth.ts); ownership ids always come from the session, never the request body.
- **Concurrency**: close-day runs in one transaction with `SELECT ... FOR UPDATE`; same payload returns 200, a different one 409.
- **Rate limits** are Postgres-backed (`rate_limits`): login, public statement, public vendor list, share creation, voice, chat, geocoding.
- **Migrations** are in [prisma/migrations](prisma/migrations): `0001_init` (+RLS), `0002_admin_public` (roles, public listing), `0003_vendor_upi`, `0004_payment_records`.

## API

Generated from the Zod schemas: **`/api/docs`** (JSON at `/api/openapi.json`). Groups: Auth, Vendor, Items, Day (`today`, `context`, `sales`, `payments`, `close`), Plan, Money, Passport (+ share), Notices, Admin, Public (`vendors`, `passport`), Voice, Assistant, Geo, `GET /api/health`.

## Tests

```bash
npm test            # vitest: forecast, money, passport, reliability, voice, rag, i18n, API ownership, close-day concurrency
npm run test:e2e    # playwright smoke (needs `npx playwright install chromium` and a production build)
npm run check       # typecheck + lint + test + build
```

API and concurrency tests use the real database in `.env.local` and clean up the rows they create.

## Demo script (5 min)

1. `/` -> **Demo vendor**. Today shows the next-step card and the plan summary.
2. **Sell**: tap mango, pick a quantity, add banana, **Collect**, **Pay by UPI** to show the QR, then **Payment received**. Try the mic: "2 kg mango and 3 banana".
3. **Today -> Close day**: one tap, see profit / waste / missed sales.
4. **Plan**: tomorrow's list with reasons, change a quantity, press Read aloud.
5. **Money** (before vs after, tagged as seeded data) and **Payments** (bills with products).
6. **Income proof**: **Share**, open the link in a private window, revoke it.
7. Open the **chat assistant** (bottom right) and ask "How did my last 7 days go?" or "How do I take a UPI payment?".
8. Log out, `/vendors` as the public: ranked vendors, a profile, Call and Directions.
9. **Demo admin**: overview, publish a notice, registration assist, export CSV.

## Notes

- Seed: the fruit vendor has 32 days (so the loan checklist can be fully ticked), the others 28. `npm run db:seed` also runs [scripts/seed-demo-payments.ts](scripts/seed-demo-payments.ts), which groups sales into bills with cash/UPI and adds today's bills; `npm run db:seed:payments` runs only that top-up.
- Registration assist is a **simulated** process; nothing is sent to any government system.
- The Degular typeface is commercial and not bundled. Hanken Grotesk is the stand-in; a locally installed Degular is picked first (see `--font-heading` in [app/globals.css](app/globals.css)).

## Deploy to Vercel

Config is in [vercel.json](vercel.json) (region `hnd1`, next to the Supabase pooler in ap-northeast-1; 30 s API timeout; `sw.js` never cached).

1. Push the repo to GitHub and **Import** it in Vercel (Next.js is auto-detected).
2. Project Settings -> Environment Variables (Production + Preview), same names as `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (mark sensitive)
   - `DATABASE_URL` (pooled, `?pgbouncer=true&connection_limit=5&pool_timeout=30&connect_timeout=30`), `DIRECT_URL`
   - `APP_URL` and `NEXT_PUBLIC_APP_URL` = the production URL, e.g. `https://<project>.vercel.app`
   - `DEMO_MODE=true`, `GROQ_API_KEY` (mark sensitive)
3. The database is already migrated and seeded if you use the same Supabase project. For a fresh one run locally against it: `npm run db:deploy && npm run db:seed`.
4. Deploy. Check `https://<project>.vercel.app/api/health` returns `"db":"up"`, then use the Demo login buttons.

Or with the CLI: `npx vercel link`, `npx vercel env add <NAME> production` for each variable, `npx vercel --prod`.

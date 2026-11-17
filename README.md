# CartWise

**Plan the day. Prove the income.** A Malayalam-first PWA for street vendors in Kerala: log sales by tap or voice, close the day, get tomorrow's buy list with reasons (read aloud), see real profit and waste, share a proof-of-income statement, and find cheaper wholesale offers. The product name lives in one constant: [config/brand.ts](config/brand.ts).

> Demo numbers are **synthetic seed data**, never measured field results. The UI shows a "Demo data" badge when `DEMO_MODE=true`.

## Run locally

```bash
npm install
cp .env.example .env.local        # fill in the Supabase + DB values
npm run db:deploy                 # apply prisma/migrations (tables + RLS deny-all)
npm run db:seed                   # 3 vendors x 28-32 days, officer, 2 markets, 5 notices, 6 offers
npm run dev                       # http://localhost:3000   API docs: /api/docs
```

Demo logins (when `DEMO_MODE=true`): buttons on `/` and `/login`. Vendor `9000000001` / PIN `1234`; officer `officer@demo.cartwise.app`; market `market@demo.cartwise.app`.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: creates users, seed |
| `DATABASE_URL` | Pooled Postgres (`pgbouncer=true`) for runtime |
| `DIRECT_URL` | Direct/session Postgres for migrations |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | Base URL for share links and OG |
| `DEMO_MODE` | `true` shows demo login + badge |

## Architecture

```
Browser (React, TanStack Query, IndexedDB offline queue, service worker)
   |  fetch /api/v1/*   { data } | { error: { code, message } }
   v
app/api/v1/**/route.ts      thin: route() wrapper = guard -> rate limit -> Zod parse -> handler
   v
server/services/*           business rules; pure logic in forecast.ts money.ts passport.ts offers.ts
   v
server/repositories/*       Prisma only
   v
Supabase Postgres (RLS deny-all)      Supabase Auth (role in app_metadata)
shared/schemas  (Zod, used by server + client + OpenAPI)      shared/voice.ts (voice parser)
```

- **Auth**: Supabase Auth. Vendors: phone + PIN mapped to `<phone>@vendor.local`, password `cw-<PIN>` (Supabase needs 6+ chars). SMS OTP is the production path (needs a paid provider). Officers/markets: email + password. One guard `requireRole()` in [server/lib/auth.ts](server/lib/auth.ts); ownership ids always come from the session.
- **Offline**: Sell and Close write to an IndexedDB queue first (optimistic), sync on reconnect with retry; sales are idempotent on `client_id`; close-day is idempotent (same payload 200, different 409) and runs in one transaction with `SELECT ... FOR UPDATE`.
- **Forecast**: newsvendor on the last 8 closed days. Constants in [server/config/constants.ts](server/config/constants.ts).
- **Rate limits** are Postgres-backed (`rate_limits`): login, public passport, share creation.

## API

Full, generated from the Zod schemas: **`/api/docs`** (JSON at `/api/openapi.json`). Groups: Auth, Vendor, Items, Day (`today`, `context`, `sales`, `close`), Plan, Money, Passport (+ share), Offers, Notices, Officer, Market, Public, `GET /api/health`.

## Tests

```bash
npm test            # vitest: forecast, money, passport, offers, voice, i18n, API ownership, close-day concurrency
npm run test:e2e    # playwright smoke (needs `npx playwright install chromium` and a production build)
npm run check       # typecheck + lint + test + build
```

API and concurrency tests use the real database in `.env.local` and clean up the rows they create.

## Demo script (5 min)

1. `/` -> **Demo vendor**. Today shows the plan card and sales so far.
2. **Sell**: tap mango tiles, long-press for quantities, undo from the strip. Toggle offline in devtools: the badge shows "Offline - N saved", then "Synced".
3. **Close day**: step through the items, enter cost, see profit / waste / missed sales.
4. **Plan**: tomorrow's list with reasons, change a quantity, press Play (Malayalam voice if the device has one).
5. **Money**: the Before vs After card (gut feeling vs followed the plan; tagged as seeded demo data).
6. **Passport**: readiness ring, **Share**, open the link in a private window; revoke it.
7. Log out, **Demo officer**: overview, publish a notice, registration assist, approve the pending market, export CSV. **Demo market**: post an offer; the vendor Offers tab shows "Save about Rs X tomorrow".

## Notes

- Seed: fruit vendor has 32 days (so the readiness checklist can be fully ticked), others 28. First days are "gut feel", the last 14 follow the plan.
- Registration assist is a **simulated** process; nothing is sent to any government system. The readiness list is indicative, not official eligibility.

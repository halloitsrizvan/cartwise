/**
 * Top-up for the demo vendors (synthetic data):
 *  1. groups the seeded sales into bills with a payment method (cash / UPI) and the unit price
 *  2. adds a UPI id to each demo vendor
 *  3. adds today's morning bills so Today, Sell and Payments pages are not empty
 * Idempotent. Run: npx tsx --env-file=.env.local scripts/seed-demo-payments.ts
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { todayIST, toDbDate } from "../server/lib/dates";

const prisma = new PrismaClient();
const DEMO_EMAILS = ["vendor@demo.cartwise.app", "lekha@demo.cartwise.app", "joseph@demo.cartwise.app"];
const UPI: Record<string, string> = { "vendor@demo.cartwise.app": "suresh.fruits@okaxis", "lekha@demo.cartwise.app": "lekha.tea@oksbi", "joseph@demo.cartwise.app": "joseph.veg@okhdfcbank" };

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const profiles = await prisma.profile.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true, email: true } });
  console.log(`demo vendors found: ${profiles.length}`);

  for (const [pi, p] of profiles.entries()) {
    const rand = rng(900 + pi);
    await prisma.$executeRaw`UPDATE vendors SET upi_id = ${UPI[p.email!]} WHERE profile_id = ${p.id}::uuid`;

    // 1. legacy sales -> bills
    const legacy = await prisma.$queryRaw<{ id: string; day_log_id: string; ts: Date; price: number }[]>`
      SELECT s.id::text AS id, s.day_log_id::text AS day_log_id, s.ts, i.sell_price AS price
      FROM sale_events s
      JOIN day_logs d ON d.id = s.day_log_id
      JOIN items i ON i.id = s.item_id
      WHERE d.vendor_id = ${p.id}::uuid AND s.bill_id IS NULL AND s.client_id NOT LIKE 'demo-today-%'
      ORDER BY s.day_log_id, s.ts`;
    const ids: string[] = [];
    const bills: string[] = [];
    const methods: string[] = [];
    const prices: number[] = [];
    let i = 0;
    while (i < legacy.length) {
      const size = 1 + Math.floor(rand() * 4);
      const group = legacy.slice(i, i + size).filter((r) => r.day_log_id === legacy[i].day_log_id);
      const billId = `demo-${randomUUID()}`;
      const method = rand() < 0.42 ? "upi" : "cash";
      for (const r of group) {
        ids.push(r.id);
        bills.push(billId);
        methods.push(method);
        prices.push(r.price);
      }
      i += group.length;
    }
    for (let k = 0; k < ids.length; k += 1500) {
      const sl = (a: unknown[]) => a.slice(k, k + 1500);
      await prisma.$executeRaw`
        UPDATE sale_events s SET bill_id = v.b, pay_method = v.m, unit_price = v.p
        FROM (SELECT unnest(${sl(ids) as string[]}::uuid[]) AS id, unnest(${sl(bills) as string[]}::text[]) AS b, unnest(${sl(methods) as string[]}::text[]) AS m, unnest(${sl(prices) as number[]}::float8[]) AS p) v
        WHERE s.id = v.id`;
    }
    console.log(`${p.email}: ${ids.length} sales grouped into ${new Set(bills).size} bills`);

    // 3. today's morning bills
    const today = todayIST();
    const dayLog = await prisma.dayLog.findUnique({ where: { vendorId_date: { vendorId: p.id, date: toDbDate(today) } } });
    if (!dayLog || dayLog.status === "closed") continue;
    const already = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM sale_events WHERE day_log_id = ${dayLog.id}::uuid AND client_id LIKE 'demo-today-%'`;
    if (Number(already[0].n) > 0) {
      console.log(`${p.email}: today's demo sales already present`);
      continue;
    }
    const items = await prisma.item.findMany({ where: { vendorId: p.id, active: true }, orderBy: { sortOrder: "asc" } });
    if (!items.length) continue;
    const rows: { id: string; item: string; qty: number; ts: Date; client: string; bill: string; method: string; price: number }[] = [];
    const nBills = 7 + Math.floor(rand() * 4);
    for (let b = 0; b < nBills; b++) {
      const billId = `demo-${randomUUID()}`;
      const method = rand() < 0.45 ? "upi" : "cash";
      const ts = new Date(Date.now() - Math.floor(rand() * 5 * 3_600_000) - 60_000);
      const picks = new Set<number>();
      const lines = 1 + Math.floor(rand() * 3);
      while (picks.size < Math.min(lines, items.length)) picks.add(Math.floor(rand() * items.length));
      for (const idx of picks) {
        const it = items[idx];
        const step = it.unitStep;
        const qty = Math.round((step * (1 + Math.floor(rand() * (step < 1 ? 6 : 4)))) * 1000) / 1000;
        rows.push({ id: randomUUID(), item: it.id, qty, ts, client: `demo-today-${p.id}-${b}-${idx}`, bill: billId, method, price: it.sellPrice });
      }
    }
    await prisma.$executeRaw`
      INSERT INTO sale_events (id, day_log_id, item_id, qty, ts, client_id, voided, bill_id, pay_method, unit_price, created_at, updated_at)
      SELECT unnest(${rows.map((r) => r.id)}::uuid[]), ${dayLog.id}::uuid, unnest(${rows.map((r) => r.item)}::uuid[]), unnest(${rows.map((r) => r.qty)}::float8[]),
             unnest(${rows.map((r) => r.ts)}::timestamptz[]), unnest(${rows.map((r) => r.client)}::text[]), false,
             unnest(${rows.map((r) => r.bill)}::text[]), unnest(${rows.map((r) => r.method)}::text[]), unnest(${rows.map((r) => r.price)}::float8[]), now(), now()`;
    console.log(`${p.email}: ${nBills} bills added for today (${rows.length} lines)`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

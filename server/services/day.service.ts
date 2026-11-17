import { createHash } from "node:crypto";
import type { CloseDayInput } from "@/shared/schemas/domain";
import { FOLLOWED_TOLERANCE } from "../config/constants";
import { addDays, fromDbDate, toDbDate, todayIST } from "../lib/dates";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { dayRepository } from "../repositories/day.repository";
import { planRepository } from "../repositories/plan.repository";
import { vendorRepository } from "../repositories/vendor.repository";
import { itemDTO } from "./dto";
import { dayMetrics, deriveClose } from "./money";
import { generateForDate, getOrGenerate } from "./plan.service";

const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );
const hashPayload = (p: unknown) => createHash("sha256").update(stable(p)).digest("hex");

function summarise(
  day: { purchaseCost: number },
  rows: { boughtQty: number; soldQty: number; leftoverQty: number; soldOut: boolean; item: { buyPrice: number; sellPrice: number } }[],
) {
  const m = dayMetrics(
    rows.map((r) => ({ ...r, buyPrice: r.item.buyPrice, sellPrice: r.item.sellPrice })),
    day.purchaseCost,
  );
  return {
    revenue: m.revenue,
    waste_value: m.wasteValue,
    missed_sales_estimate: m.missedSales,
    profit: m.profit,
    waste_pct: m.wastePct,
    purchase_cost: day.purchaseCost,
  };
}

export const dayService = {
  /** Earlier days that still have sales but were never closed are closed automatically (derived numbers). */
  async autoClosePast(vendorId: string) {
    const today = todayIST();
    const open = await prisma.dayLog.findMany({
      where: { vendorId, status: "open", date: { lt: toDbDate(today), gte: toDbDate(addDays(today, -7)) }, sales: { some: { voided: false } } },
      select: { date: true },
      orderBy: { date: "asc" },
    });
    for (const d of open) await this.close(vendorId, undefined, fromDbDate(d.date)).catch((e) => console.error("[autoClose]", e));
  },

  async today(vendorId: string) {
    await this.autoClosePast(vendorId);
    const date = todayIST();
    const day = await dayRepository.ensureDay(vendorId, date);
    const items = await vendorRepository.listItems(vendorId);
    const sold = await dayRepository.soldByItem(day.id);
    let revenue = 0;
    const out = items.map((i) => {
      const q = sold[i.id] ?? 0;
      revenue += q * i.sellPrice;
      return { ...itemDTO(i), sold_qty: q };
    });
    let summary = null;
    if (day.status === "closed") {
      const sums = await prisma.dayItemSummary.findMany({ where: { dayLogId: day.id }, include: { item: true } });
      summary = summarise(day, sums);
    }
    const plan = await getOrGenerate(vendorId, date);
    return {
      date,
      log: { id: day.id, rain: day.rain, festival: day.festival, payday_week: day.paydayWeek, status: day.status, purchase_cost: day.purchaseCost },
      items: out,
      totals: { revenue: Math.round(revenue), sold_count: Object.values(sold).reduce((s, v) => s + v, 0) },
      summary,
      plan_today: { total_expected_profit: Math.round(plan.totalExpectedProfit) },
    };
  },

  async setContext(vendorId: string, ctx: { rain?: boolean; festival?: boolean; payday_week?: boolean }) {
    const day = await dayRepository.ensureDay(vendorId, todayIST());
    await dayRepository.updateContext(day.id, { rain: ctx.rain, festival: ctx.festival, paydayWeek: ctx.payday_week });
    return { rain: ctx.rain ?? day.rain, festival: ctx.festival ?? day.festival, payday_week: ctx.payday_week ?? day.paydayWeek };
  },

  /** Idempotent on client_id (skipDuplicates). Items must belong to the session vendor. */
  async addSales(vendorId: string, events: { client_id: string; item_id: string; qty: number; ts: string; bill_id?: string; pay_method?: "cash" | "upi" }[]) {
    const owned = await prisma.item.findMany({ where: { vendorId, id: { in: [...new Set(events.map((e) => e.item_id))] } }, select: { id: true, sellPrice: true } });
    const ok = new Set(owned.map((o) => o.id));
    const price = new Map(owned.map((o) => [o.id, o.sellPrice]));
    if (events.some((e) => !ok.has(e.item_id))) throw AppError.notFound("Item not found");
    const day = await dayRepository.ensureDay(vendorId, todayIST());
    if (day.status === "closed") throw AppError.conflict("Day already closed");
    const inserted = await dayRepository.insertSales(
      day.id,
      events.map((e) => ({ clientId: e.client_id, itemId: e.item_id, qty: e.qty, ts: new Date(e.ts), billId: e.bill_id, payMethod: e.pay_method, unitPrice: price.get(e.item_id) })),
    );
    return { received: events.length, inserted, duplicates: events.length - inserted };
  },

  /** Payment records: sales grouped into bills (one per customer payment), newest first. */
  async payments(vendorId: string, rangeDays: number) {
    const from = addDays(todayIST(), -(rangeDays - 1));
    const rows = await prisma.saleEvent.findMany({
      where: { voided: false, dayLog: { vendorId, date: { gte: toDbDate(from) } } },
      include: { item: true, dayLog: { select: { date: true } } },
      orderBy: { ts: "desc" },
      take: 5000,
    });
    type Line = { item_id: string; name_ml: string; name_en: string; emoji: string; unit: string; qty: number; price: number; amount: number };
    type Bill = { id: string; date: string; ts: string; method: "cash" | "upi" | null; legacy: boolean; total: number; lines: Line[] };
    const bills = new Map<string, Bill>();
    for (const r of rows) {
      const date = fromDbDate(r.dayLog.date);
      // sales logged before bills existed are shown as one "earlier sales" record per day
      const key = r.billId ?? `legacy:${date}`;
      const price = r.unitPrice ?? r.item.sellPrice;
      const line: Line = { item_id: r.itemId, name_ml: r.item.nameMl, name_en: r.item.nameEn, emoji: r.item.emoji, unit: r.item.unit, qty: r.qty, price, amount: Math.round(r.qty * price * 100) / 100 };
      const b = bills.get(key) ?? { id: key, date, ts: r.ts.toISOString(), method: (r.payMethod as "cash" | "upi" | null) ?? null, legacy: !r.billId, total: 0, lines: [] };
      const existing = b.lines.find((l) => l.item_id === line.item_id && l.price === line.price);
      if (existing) {
        existing.qty = Math.round((existing.qty + line.qty) * 1000) / 1000;
        existing.amount = Math.round((existing.amount + line.amount) * 100) / 100;
      } else b.lines.push(line);
      b.total = Math.round((b.total + line.amount) * 100) / 100;
      bills.set(key, b);
    }
    const list = [...bills.values()].sort((a, b) => b.ts.localeCompare(a.ts));
    const days = new Map<string, { date: string; total: number; bills: Bill[] }>();
    for (const b of list) {
      const d = days.get(b.date) ?? { date: b.date, total: 0, bills: [] };
      d.total = Math.round((d.total + b.total) * 100) / 100;
      d.bills.push(b);
      days.set(b.date, d);
    }
    const sum = (m: "cash" | "upi" | null) => Math.round(list.filter((b) => b.method === m).reduce((s, b) => s + b.total, 0));
    return {
      range: rangeDays,
      totals: { total: Math.round(list.reduce((s, b) => s + b.total, 0)), cash: sum("cash"), upi: sum("upi"), other: sum(null), bills: list.filter((b) => !b.legacy).length },
      days: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)),
    };
  },

  async voidSale(vendorId: string, ref: string) {
    const sale = await dayRepository.findSaleOwned(vendorId, ref);
    if (!sale) throw AppError.notFound("Sale not found");
    if (!sale.voided) await dayRepository.voidSale(sale.id);
    return { id: sale.id, voided: true };
  },

  /**
   * One transaction. Locks the day_log row (FOR UPDATE) so parallel requests serialise:
   * the first writes, the rest see status=closed and return 200 (same payload) or 409 (different payload).
   */
  /**
   * Close a day. Without `input` the numbers are derived from the sales (see deriveClose).
   * `forDate` lets the auto-close job close an earlier day.
   */
  async close(vendorId: string, input?: CloseDayInput, forDate?: string) {
    const today = forDate ?? todayIST();
    const tomorrow = addDays(today, 1);
    const payloadHash = input ? hashPayload(input) : "derived";
    const day0 = await dayRepository.ensureDay(vendorId, today); // outside tx: race-safe create

    return prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM day_logs WHERE id = ${day0.id}::uuid FOR UPDATE`;
        const day = await tx.dayLog.findUniqueOrThrow({ where: { id: day0.id } });

        if (day.status === "closed") {
          if (day.closePayload !== payloadHash) throw AppError.conflict("Day already closed with different numbers");
          const sums = await tx.dayItemSummary.findMany({ where: { dayLogId: day.id }, include: { item: true } });
          return { idempotent: true, summary: summarise(day, sums) };
        }

        const items = await tx.item.findMany({ where: { vendorId } });
        const owned = new Set(items.map((i) => i.id));
        const sold = await dayRepository.soldByItem(day.id, tx);
        const dayPlan = await planRepository.find(vendorId, today, tx);
        if (!input) {
          const ov = ((dayPlan?.overrides ?? {}) as Record<string, number>);
          const rec = new Map(((dayPlan?.lines ?? []) as unknown as { item_id: string; recommended: number }[]).map((l) => [l.item_id, l.recommended]));
          input = {
            ...deriveClose(items.filter((i) => i.active || (sold[i.id] ?? 0) > 0).map((i) => ({ itemId: i.id, sold: sold[i.id] ?? 0, planned: dayPlan ? (ov[i.id] ?? rec.get(i.id) ?? null) : null, buyPrice: i.buyPrice }))),
          };
        }
        if (input.items.some((i) => !owned.has(i.item_id))) throw AppError.notFound("Item not found");
        const given = new Map(input.items.map((i) => [i.item_id, i]));

        const rows = items
          .filter((i) => i.active || given.has(i.id) || (sold[i.id] ?? 0) > 0)
          .map((i) => {
            const g = given.get(i.id);
            const soldQty = sold[i.id] ?? 0;
            return {
              dayLogId: day.id,
              itemId: i.id,
              boughtQty: g?.bought_qty ?? soldQty,
              soldQty,
              leftoverQty: g?.leftover_qty ?? 0,
              soldOut: g?.sold_out ?? false,
              soldOutAt: g?.sold_out_at ?? null,
              item: i,
            };
          });

        await tx.dayItemSummary.deleteMany({ where: { dayLogId: day.id } });
        await tx.dayItemSummary.createMany({ data: rows.map(({ item: _i, ...r }) => (void _i, r)) });

        const plan = await planRepository.find(vendorId, today, tx);
        if (plan) {
          const overrides = (plan.overrides ?? {}) as Record<string, number>;
          const lines = plan.lines as unknown as { item_id: string; recommended: number }[];
          const actuals = lines
            .filter((l) => rows.some((r) => r.itemId === l.item_id))
            .map((l) => {
              const bought = rows.find((r) => r.itemId === l.item_id)!.boughtQty;
              const eff = overrides[l.item_id] ?? l.recommended;
              const followed = eff === 0 ? bought === 0 : Math.abs(bought - eff) / eff <= FOLLOWED_TOLERANCE;
              return { itemId: l.item_id, boughtQty: bought, followed };
            });
          await planRepository.replaceActuals(plan.id, actuals, tx);
        }

        const closed = await tx.dayLog.update({
          where: { id: day.id },
          data: { status: "closed", purchaseCost: input.purchase_cost, closedAt: new Date(), closePayload: payloadHash },
        });
        if (today === todayIST()) await generateForDate(vendorId, tomorrow, { resetOverrides: true, db: tx });
        return { idempotent: false, summary: summarise(closed, rows) };
      },
      { timeout: 25_000, maxWait: 15_000 },
    );
  },
};


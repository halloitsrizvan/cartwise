import type { Prisma } from "@prisma/client";
import type { PlanLine, StallType } from "@/shared/schemas/domain";
import { HISTORY_DAYS } from "../config/constants";
import { addDays, fromDbDate, todayIST } from "../lib/dates";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { dayRepository } from "../repositories/day.repository";
import { planRepository } from "../repositories/plan.repository";
import { vendorRepository, type Db } from "../repositories/vendor.repository";
import { generatePlan, profitFor, weekdayOf, type HistoryDay } from "./forecast";
import { itemDTO } from "./dto";

type StoredLine = PlanLine & { demand?: number };

/** Build and persist the plan for `forDate`. Runs inside a caller-supplied transaction when given. */
export async function generateForDate(vendorId: string, forDate: string, opts: { resetOverrides?: boolean; db?: Db } = {}) {
  const db = opts.db ?? prisma;
  const vendor = await vendorRepository.getWithProfile(vendorId, db);
  if (!vendor) throw AppError.notFound("Vendor not found");
  const items = await vendorRepository.listItems(vendorId, false, db);
  const closed = await dayRepository.closedDays(vendorId, HISTORY_DAYS, forDate, db);
  const closedTotal = await dayRepository.countClosed(vendorId, db);
  const dayLog = await dayRepository.find(vendorId, forDate, db);

  const asc = [...closed].reverse();
  const historyByItem: Record<string, HistoryDay[]> = {};
  for (const d of asc) {
    for (const s of d.summaries) {
      (historyByItem[s.itemId] ??= []).push({ date: fromDbDate(d.date), sold: s.soldQty, soldOut: s.soldOut });
    }
  }
  const { lines, totalExpectedProfit } = generatePlan({
    items: items.map((i) => ({ id: i.id, buyPrice: i.buyPrice, sellPrice: i.sellPrice, unitStep: i.unitStep, categorySlug: i.categorySlug })),
    stall: vendor.stallType as StallType,
    historyByItem,
    closedDays: closedTotal,
    targetDate: forDate,
    ctx: { rain: dayLog?.rain ?? false, festival: dayLog?.festival ?? false, paydayWeek: dayLog?.paydayWeek ?? false },
  });
  return planRepository.upsert(
    vendorId,
    forDate,
    { lines: lines as unknown as Prisma.InputJsonValue, totalExpectedProfit, ...(opts.resetOverrides ? { overrides: {} } : {}) },
    db,
  );
}

export async function getOrGenerate(vendorId: string, forDate: string) {
  return (await planRepository.find(vendorId, forDate)) ?? (await generateForDate(vendorId, forDate));
}

async function present(vendorId: string, forDate: string, plan: Awaited<ReturnType<typeof getOrGenerate>>) {
  const items = await vendorRepository.listItems(vendorId, true);
  const byId = new Map(items.map((i) => [i.id, i]));
  const overrides = (plan.overrides ?? {}) as Record<string, number>;
  const stored = plan.lines as unknown as StoredLine[];
  const dayLog = await dayRepository.find(vendorId, forDate);
  let spend = 0;
  let profit = 0;
  const lines = stored
    .filter((l) => byId.get(l.item_id)?.active)
    .map((l) => {
      const it = byId.get(l.item_id)!;
      const overridden = overrides[l.item_id] !== undefined;
      const qty = overridden ? overrides[l.item_id] : l.recommended;
      const demand = l.demand ?? l.expected_sales;
      const effProfit = profitFor(demand, qty, it.buyPrice, it.sellPrice);
      spend += qty * it.buyPrice;
      profit += effProfit;
      return { ...l, item: itemDTO(it), overridden, chosen_qty: qty, effective_profit: Math.round(effProfit * 100) / 100 };
    });
  return {
    for_date: forDate,
    weekday: weekdayOf(forDate),
    context: { rain: dayLog?.rain ?? false, festival: dayLog?.festival ?? false, payday_week: dayLog?.paydayWeek ?? false },
    lines,
    total_spend: Math.round(spend),
    total_expected_profit: Math.round(profit),
    confidence: lines[0]?.confidence ?? "low",
    generated_at: plan.generatedAt.toISOString(),
  };
}

export const planService = {
  async tomorrow(vendorId: string) {
    const date = addDays(todayIST(), 1);
    return present(vendorId, date, await getOrGenerate(vendorId, date));
  },
  async forToday(vendorId: string) {
    const date = todayIST();
    return present(vendorId, date, await getOrGenerate(vendorId, date));
  },

  async override(vendorId: string, input: { item_id: string; chosen_qty: number }) {
    const item = await vendorRepository.findItem(vendorId, input.item_id);
    if (!item) throw AppError.notFound("Item not found");
    const date = addDays(todayIST(), 1);
    const plan = await getOrGenerate(vendorId, date);
    const overrides = { ...((plan.overrides ?? {}) as Record<string, number>), [input.item_id]: input.chosen_qty };
    const updated = await planRepository.setOverrides(plan.id, overrides);
    return present(vendorId, date, updated);
  },

  /** Rain / festival / payday for tomorrow: update the day row and regenerate (overrides reset). */
  async setTomorrowContext(vendorId: string, ctx: { rain?: boolean; festival?: boolean; paydayWeek?: boolean }) {
    const date = addDays(todayIST(), 1);
    const day = await dayRepository.ensureDay(vendorId, date);
    await dayRepository.updateContext(day.id, ctx);
    const plan = await generateForDate(vendorId, date, { resetOverrides: true });
    return present(vendorId, date, plan);
  },
};

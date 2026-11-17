import { addDays, fromDbDate, todayIST } from "../lib/dates";
import { dayRepository } from "../repositories/day.repository";
import { planRepository } from "../repositories/plan.repository";
import { vendorRepository } from "../repositories/vendor.repository";
import { isDemoPhone } from "./dto";
import { beforeAfter, dayMetrics, type DayPoint } from "./money";

export type DayRecord = DayPoint & { revenue: number; wasteValue: number; missedSales: number; purchaseCost: number };

/** All closed days of a vendor with metrics and followed flag (from plan_actuals, majority rule). */
export async function loadDayRecords(vendorId: string, take = 120): Promise<DayRecord[]> {
  const [days, items, plans] = await Promise.all([
    dayRepository.closedDays(vendorId, take),
    vendorRepository.listItems(vendorId, true),
    planRepository.actualsByDate(vendorId),
  ]);
  const price = new Map(items.map((i) => [i.id, i]));
  const followedByDate = new Map<string, boolean>();
  for (const p of plans) {
    if (!p.actuals.length) continue;
    followedByDate.set(fromDbDate(p.forDate), p.actuals.filter((a) => a.followed).length > p.actuals.length / 2);
  }
  return days
    .map((d) => {
      const rows = d.summaries.flatMap((s) => {
        const it = price.get(s.itemId);
        return it ? [{ ...s, buyPrice: it.buyPrice, sellPrice: it.sellPrice }] : [];
      });
      const m = dayMetrics(rows, d.purchaseCost);
      const date = fromDbDate(d.date);
      return {
        date,
        followed: followedByDate.get(date) ?? false,
        wastePct: m.wastePct,
        profit: m.profit,
        soldOutRate: m.soldOutRate,
        revenue: m.revenue,
        wasteValue: m.wasteValue,
        missedSales: m.missedSales,
        purchaseCost: d.purchaseCost,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const moneyService = {
  async summary(vendorId: string, range: 7 | 30) {
    const all = await loadDayRecords(vendorId);
    const from = addDays(todayIST(), -(range - 1));
    const days = all.filter((d) => d.date >= from);
    const sum = (f: (d: DayRecord) => number) => days.reduce((s, d) => s + f(d), 0);
    return {
      range,
      days: days.map((d) => ({
        date: d.date,
        revenue: Math.round(d.revenue),
        profit: Math.round(d.profit),
        waste_value: Math.round(d.wasteValue),
        missed_sales: Math.round(d.missedSales),
        followed: d.followed,
      })),
      totals: {
        profit: Math.round(sum((d) => d.profit)),
        avg_profit: days.length ? Math.round(sum((d) => d.profit) / days.length) : 0,
        waste_value: Math.round(sum((d) => d.wasteValue)),
        missed_sales: Math.round(sum((d) => d.missedSales)),
        closed_days: days.length,
      },
    };
  },

  async beforeAfter(vendorId: string) {
    const [all, v] = await Promise.all([loadDayRecords(vendorId), vendorRepository.getWithProfile(vendorId)]);
    const r = beforeAfter(all);
    return {
      mode: r.mode,
      before: r.before,
      after: r.after,
      demo: process.env.DEMO_MODE === "true" && isDemoPhone(v?.profile.phone),
    };
  },
};

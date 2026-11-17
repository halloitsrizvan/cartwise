/** Pure money metrics. No I/O. Safe to import client-side. */
import { FOLLOWED_TOLERANCE, SOLD_OUT_UPLIFT } from "../config/constants";

export type SummaryRow = {
  boughtQty: number;
  soldQty: number;
  leftoverQty: number;
  soldOut: boolean;
  buyPrice: number;
  sellPrice: number;
};

export type DayMetrics = {
  revenue: number;
  wasteValue: number;
  missedSales: number;
  profit: number;
  wastePct: number;
  soldOutRate: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function dayMetrics(rows: SummaryRow[], purchaseCost: number): DayMetrics {
  let revenue = 0;
  let waste = 0;
  let missed = 0;
  let soldOutCount = 0;
  for (const r of rows) {
    revenue += r.soldQty * r.sellPrice;
    waste += r.leftoverQty * r.buyPrice;
    if (r.soldOut) {
      soldOutCount++;
      const a = r.soldQty * SOLD_OUT_UPLIFT;
      missed += (a - r.soldQty) * (r.sellPrice - r.buyPrice);
    }
  }
  return {
    revenue: r2(revenue),
    wasteValue: r2(waste),
    missedSales: r2(missed),
    profit: r2(revenue - purchaseCost),
    wastePct: purchaseCost > 0 ? waste / purchaseCost : 0,
    soldOutRate: rows.length ? soldOutCount / rows.length : 0,
  };
}

/** Majority rule: a day is "followed" when more than half of its items bought within tolerance of the plan. */
export function followedPlan(rows: { bought: number; recommended: number }[]): boolean {
  if (!rows.length) return false;
  let ok = 0;
  for (const r of rows) {
    if (r.recommended === 0) {
      if (r.bought === 0) ok++;
    } else if (Math.abs(r.bought - r.recommended) / r.recommended <= FOLLOWED_TOLERANCE) ok++;
  }
  return ok > rows.length / 2;
}

export type DayPoint = { date: string; followed: boolean; wastePct: number; profit: number; soldOutRate: number };
export type GroupStats = { days: number; avgWastePct: number; avgProfit: number; soldOutRate: number };

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
const stats = (ds: DayPoint[]): GroupStats => ({
  days: ds.length,
  avgWastePct: avg(ds.map((d) => d.wastePct)),
  avgProfit: avg(ds.map((d) => d.profit)),
  soldOutRate: avg(ds.map((d) => d.soldOutRate)),
});

/** followed days vs not-followed days; falls back to first-7-days vs the rest when nothing is followed yet. */
export function beforeAfter(days: DayPoint[]): {
  mode: "followed" | "first7" | "none";
  before: GroupStats;
  after: GroupStats;
} {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const followed = sorted.filter((d) => d.followed);
  const gut = sorted.filter((d) => !d.followed);
  if (followed.length && gut.length) return { mode: "followed", before: stats(gut), after: stats(followed) };
  if (!followed.length && sorted.length > 7) {
    return { mode: "first7", before: stats(sorted.slice(0, 7)), after: stats(sorted.slice(7)) };
  }
  return { mode: "none", before: stats(gut), after: stats(followed) };
}

/**
 * Close the day from selling data alone: bought = the plan quantity (or what was sold, if more),
 * leftover = bought - sold, sold out = sold at least the planned quantity, cost = bought x buy price.
 * Used by both the server (auto close) and the client (instant summary), so they always agree.
 */
export function deriveClose(rows: { itemId: string; sold: number; planned: number | null; buyPrice: number }[]) {
  let cost = 0;
  const items = rows.map((r) => {
    const bought = r.planned === null ? r.sold : Math.max(r.planned, r.sold);
    cost += bought * r.buyPrice;
    return {
      item_id: r.itemId,
      bought_qty: Math.round(bought * 1000) / 1000,
      leftover_qty: Math.round((bought - r.sold) * 1000) / 1000,
      sold_out: r.planned !== null && r.planned > 0 && r.sold >= r.planned,
    };
  });
  return { items, purchase_cost: Math.round(cost) };
}

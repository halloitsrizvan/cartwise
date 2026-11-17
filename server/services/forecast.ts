/** Pure forecast engine (newsvendor). No I/O. All constants from server/config/constants.ts */
import {
  COLD_START_MIN_DAYS,
  CONFIDENCE_HIGH_DAYS,
  CR_MAX,
  CR_MIN,
  DEFAULT_BASELINE,
  FESTIVAL_MULT,
  HISTORY_DAYS,
  MAX_OVER_BASE,
  PAYDAY_MULT,
  RAIN_MULT_DEFAULT,
  RAIN_MULT_TEA_SNACKS,
  RANGE_SD_FRACTION,
  SAME_WEEKDAY_WEIGHT,
  SD_MIN_FRACTION,
  SOLD_OUT_UPLIFT,
  TREND_THRESHOLD,
  WEEKDAY_EFFECT_THRESHOLD,
  WEEK_DECAY,
} from "../config/constants";
import type { PlanLine, StallType } from "@/shared/schemas/domain";

export type HistoryDay = { date: string; sold: number; soldOut: boolean };
export type DayContext = { rain: boolean; festival: boolean; paydayWeek: boolean };
export type ForecastItem = {
  id: string;
  buyPrice: number;
  sellPrice: number;
  unitStep: number;
  categorySlug: string;
};

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const weekdayOf = (d: string) => new Date(parse(d)).getUTCDay();

/** Inverse standard normal CDF (Acklam approximation, rel. error < 1.2e-9). */
export function inverseNormalCdf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export const adjustedDemand = (sold: number, soldOut: boolean) => (soldOut ? sold * SOLD_OUT_UPLIFT : sold);

export function roundToStep(x: number, step: number): number {
  if (!(step > 0)) return Math.max(0, x);
  const v = Math.round(x / step) * step;
  return Math.max(0, Math.round(v * 1000) / 1000);
}

/** weight = (same weekday ? 2 : 1) * 0.9^weeksAgo */
export function weightedBase(history: HistoryDay[], targetDate: string): number {
  let num = 0;
  let den = 0;
  const tw = weekdayOf(targetDate);
  for (const h of history) {
    const weeksAgo = Math.max(0, Math.floor((parse(targetDate) - parse(h.date)) / DAY_MS / 7));
    const w = (weekdayOf(h.date) === tw ? SAME_WEEKDAY_WEIGHT : 1) * Math.pow(WEEK_DECAY, weeksAgo);
    num += w * adjustedDemand(h.sold, h.soldOut);
    den += w;
  }
  return den > 0 ? num / den : 0;
}

export function contextMultiplier(ctx: DayContext, stall: StallType): number {
  let m = 1;
  if (ctx.festival) m *= FESTIVAL_MULT;
  if (ctx.paydayWeek) m *= PAYDAY_MULT;
  if (ctx.rain) m *= stall === "tea_snacks" ? RAIN_MULT_TEA_SNACKS : RAIN_MULT_DEFAULT;
  return m;
}

export function observedSd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

export function criticalRatio(sell: number, buy: number): number {
  const cu = sell - buy;
  const co = buy;
  if (cu <= 0) return CR_MIN;
  const raw = cu / (cu + co);
  return Math.min(CR_MAX, Math.max(CR_MIN, raw));
}

export function confidenceFor(closedDays: number): "low" | "medium" | "high" {
  if (closedDays < COLD_START_MIN_DAYS) return "low";
  if (closedDays >= CONFIDENCE_HIGH_DAYS) return "high";
  return "medium";
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

export function reasonCodes(args: {
  history: HistoryDay[];
  targetDate: string;
  ctx: DayContext;
  stall: StallType;
  coldStart: boolean;
}): string[] {
  const { history, targetDate, ctx, stall, coldStart } = args;
  const out: string[] = [];
  if (ctx.festival) out.push("FESTIVAL_UP");
  if (ctx.rain) out.push(stall === "tea_snacks" ? "RAIN_UP" : "RAIN_DOWN");
  if (ctx.paydayWeek) out.push("PAYDAY_UP");
  if (coldStart) {
    out.push("FEW_DATA");
    return out;
  }
  const tw = weekdayOf(targetDate);
  const a = (h: HistoryDay) => adjustedDemand(h.sold, h.soldOut);
  const same = history.filter((h) => weekdayOf(h.date) === tw).map(a);
  const other = history.filter((h) => weekdayOf(h.date) !== tw).map(a);
  if (same.length && other.length && mean(other) > 0) {
    const ratio = mean(same) / mean(other) - 1;
    if (ratio >= WEEKDAY_EFFECT_THRESHOLD) out.push("WEEKDAY_HIGH");
    else if (ratio <= -WEEKDAY_EFFECT_THRESHOLD) out.push("WEEKDAY_LOW");
  }
  const recent = history.slice(-3);
  if (recent.some((h) => h.soldOut)) out.push("SOLD_OUT_BOOST");
  if (history.length >= 6) {
    const first = mean(history.slice(0, 3).map(a));
    const last = mean(history.slice(-3).map(a));
    if (first > 0) {
      const t = last / first - 1;
      if (t >= TREND_THRESHOLD) out.push("TREND_UP");
      else if (t <= -TREND_THRESHOLD) out.push("TREND_DOWN");
    }
  }
  return out;
}

export function defaultBaseline(stall: StallType, slug: string): number {
  const t = DEFAULT_BASELINE[stall] ?? {};
  return t[slug] ?? t.default ?? 5;
}

/** Expected profit when buying `qty` against expected demand. */
export function profitFor(demand: number, qty: number, buy: number, sell: number): number {
  const sales = Math.min(demand, qty);
  return sales * (sell - buy) - Math.max(qty - sales, 0) * buy;
}

export type PlanItemInput = {
  item: ForecastItem;
  stall: StallType;
  /** last HISTORY_DAYS closed days for THIS item, oldest first */
  history: HistoryDay[];
  /** closed days for the vendor overall */
  closedDays: number;
  targetDate: string;
  ctx: DayContext;
};

export function planItem(inp: PlanItemInput): PlanLine & { demand: number } {
  const { item, stall, targetDate, ctx, closedDays } = inp;
  const history = inp.history.slice(-HISTORY_DAYS);
  const coldStart = closedDays < COLD_START_MIN_DAYS || history.length === 0;
  const rawBase = coldStart ? defaultBaseline(stall, item.categorySlug) : weightedBase(history, targetDate);
  const base = rawBase * contextMultiplier(ctx, stall);
  const obs = coldStart ? 0 : observedSd(history.map((h) => adjustedDemand(h.sold, h.soldOut)));
  const sd = Math.max(obs, SD_MIN_FRACTION * base);
  const cr = criticalRatio(item.sellPrice, item.buyPrice);
  const z = inverseNormalCdf(cr);
  const rawRec = Math.min(Math.max(0, base + z * sd), MAX_OVER_BASE * base);
  const recommended = roundToStep(rawRec, item.unitStep);
  const low = roundToStep(Math.max(0, rawRec - RANGE_SD_FRACTION * sd), item.unitStep);
  const high = roundToStep(rawRec + RANGE_SD_FRACTION * sd, item.unitStep);
  const expected_sales = Math.min(base, recommended);
  const expected_profit = profitFor(base, recommended, item.buyPrice, item.sellPrice);
  return {
    item_id: item.id,
    recommended,
    low: Math.min(low, recommended),
    high: Math.max(high, recommended),
    expected_sales: Math.round(expected_sales * 100) / 100,
    expected_profit: Math.round(expected_profit * 100) / 100,
    reason_codes: reasonCodes({ history, targetDate, ctx, stall, coldStart }),
    confidence: confidenceFor(closedDays),
    demand: Math.round(base * 100) / 100,
  };
}

export function generatePlan(args: {
  items: ForecastItem[];
  stall: StallType;
  historyByItem: Record<string, HistoryDay[]>;
  closedDays: number;
  targetDate: string;
  ctx: DayContext;
}): { lines: PlanLine[]; totalExpectedProfit: number } {
  const lines = args.items.map((item) => {
    const line = planItem({
      item,
      stall: args.stall,
      history: args.historyByItem[item.id] ?? [],
      closedDays: args.closedDays,
      targetDate: args.targetDate,
      ctx: args.ctx,
    });
    return line;
  });
  const total = Math.round(lines.reduce((s, l) => s + l.expected_profit, 0) * 100) / 100;
  return { lines, totalExpectedProfit: total };
}

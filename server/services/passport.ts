/** Pure passport / readiness logic. */
import { CV_STEADY, PASSPORT_WINDOW_DAYS, READY_MIN_CLOSED_RATIO, READY_MIN_DAYS, SLOPE_GROWING } from "../config/constants";

export type ClosedDay = { date: string; profit: number };
const DAY_MS = 86_400_000;
const ms = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

export type Consistency = "Steady" | "Growing" | "Variable";

export function coefficientOfVariation(xs: number[]): number {
  const m = mean(xs);
  if (xs.length < 2 || m <= 0) return 0;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
}

/** Least-squares slope of y over index, divided by mean (relative change per day). */
export function relativeSlope(xs: number[]): number {
  const n = xs.length;
  const m = mean(xs);
  if (n < 3 || m <= 0) return 0;
  const xm = (n - 1) / 2;
  let num = 0;
  let den = 0;
  xs.forEach((y, i) => {
    num += (i - xm) * (y - m);
    den += (i - xm) ** 2;
  });
  return den ? num / den / m : 0;
}

export function consistencyLabel(profits: number[]): Consistency {
  if (relativeSlope(profits) > SLOPE_GROWING / 2 && coefficientOfVariation(profits) < 0.6) return "Growing";
  if (coefficientOfVariation(profits) <= CV_STEADY) return "Steady";
  return "Variable";
}

export type PassportStats = {
  avgDailyProfit: number;
  activeDays: number;
  closedRatio: number;
  loggedDays: number;
  consistency: Consistency;
  periodFrom: string | null;
  periodTo: string | null;
};

export function passportStats(closed: ClosedDay[], firstLogDate: string | null, today: string): PassportStats {
  const sorted = [...closed].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = ms(today) - (PASSPORT_WINDOW_DAYS - 1) * DAY_MS;
  const win = sorted.filter((d) => ms(d.date) >= cutoff);
  const profits = win.map((d) => d.profit);
  const sinceFirst = firstLogDate ? Math.max(1, Math.round((ms(today) - ms(firstLogDate)) / DAY_MS) + 1) : 0;
  return {
    avgDailyProfit: Math.round(mean(profits)),
    activeDays: win.length,
    closedRatio: sinceFirst ? Math.min(1, sorted.length / sinceFirst) : 0,
    loggedDays: sorted.length,
    consistency: consistencyLabel(profits),
    periodFrom: win[0]?.date ?? null,
    periodTo: win[win.length - 1]?.date ?? null,
  };
}

export type SelfDeclared = { id_proof?: boolean; vending_proof_or_lor?: boolean; bank_or_upi?: boolean };
export type ReadinessItem = { key: string; auto: boolean; passed: boolean; detail?: string };

export function readiness(stats: PassportStats, declared: SelfDeclared) {
  const items: ReadinessItem[] = [
    { key: "logged_days", auto: true, passed: stats.loggedDays >= READY_MIN_DAYS, detail: `${stats.loggedDays}/${READY_MIN_DAYS}` },
    { key: "closed_ratio", auto: true, passed: stats.closedRatio >= READY_MIN_CLOSED_RATIO, detail: `${Math.round(stats.closedRatio * 100)}%` },
    { key: "avg_profit", auto: true, passed: stats.activeDays > 0 && stats.avgDailyProfit > 0, detail: `Rs ${stats.avgDailyProfit}` },
    { key: "id_proof", auto: false, passed: !!declared.id_proof },
    { key: "vending_proof_or_lor", auto: false, passed: !!declared.vending_proof_or_lor },
    { key: "bank_or_upi", auto: false, passed: !!declared.bank_or_upi },
  ];
  const passed = items.filter((i) => i.passed).length;
  return { items, passed, total: items.length, percent: Math.round((passed / items.length) * 100), ready: passed === items.length };
}

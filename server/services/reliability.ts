/** Pure public reliability score (0-100). Deliberately uses no income figures. */
import type { Consistency } from "./passport";

export type ReliabilityInput = { loggedDays: number; closedRatio: number; consistency: Consistency; avgWastePct: number };

export function reliability(i: ReliabilityInput): { score: number; badges: string[] } {
  const days = Math.min(i.loggedDays / 30, 1) * 35;
  const closed = Math.min(Math.max(i.closedRatio, 0), 1) * 25;
  const steady = i.consistency === "Variable" ? 8 : 20;
  const waste = (1 - Math.min(Math.max(i.avgWastePct, 0) / 0.25, 1)) * 20;
  const badges: string[] = [];
  if (i.loggedDays >= 30) badges.push("days30");
  if (i.consistency !== "Variable" && i.loggedDays >= 7) badges.push("steady");
  if (i.loggedDays >= 7 && i.avgWastePct <= 0.08) badges.push("low_waste");
  if (i.loggedDays >= 7 && i.closedRatio >= 0.9) badges.push("closes_daily");
  return { score: Math.round(days + closed + steady + waste), badges };
}

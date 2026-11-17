import { IST_OFFSET_MIN } from "../config/constants";

/** Current calendar date in India (YYYY-MM-DD). `now` injectable for tests. */
export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}
export const toDbDate = (d: string) => new Date(`${d}T00:00:00.000Z`);
export const fromDbDate = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(d: string, n: number): string {
  const t = toDbDate(d);
  t.setUTCDate(t.getUTCDate() + n);
  return fromDbDate(t);
}

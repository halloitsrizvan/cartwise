import { describe, expect, it } from "vitest";
import { coefficientOfVariation, consistencyLabel, passportStats, readiness } from "@/server/services/passport";

/** n consecutive days ending 2026-02-28 */
const days = (n: number, f: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2026, 1, 28 - (n - 1 - i))).toISOString().slice(0, 10), profit: f(i) }));

describe("passport", () => {
  it("labels consistency", () => {
    expect(consistencyLabel(Array.from({ length: 20 }, () => 500))).toBe("Steady");
    expect(consistencyLabel(Array.from({ length: 20 }, (_, i) => 300 + i * 30))).toBe("Growing");
    expect(consistencyLabel(Array.from({ length: 20 }, (_, i) => (i % 2 ? 900 : 100)))).toBe("Variable");
    expect(coefficientOfVariation([5])).toBe(0);
  });
  it("computes stats over the last 30 days", () => {
    const s = passportStats(days(40, () => 400), "2026-01-20", "2026-02-28");
    expect(s.activeDays).toBe(30);
    expect(s.avgDailyProfit).toBe(400);
    expect(s.loggedDays).toBe(40);
    expect(s.closedRatio).toBeCloseTo(1, 5);
  });
  it("closed ratio drops when days are skipped", () => {
    const s = passportStats(days(20, () => 100), "2026-02-01", "2026-02-28");
    expect(s.closedRatio).toBeCloseTo(20 / 28, 5);
  });
  it("readiness mixes auto and self-declared items", () => {
    const stats = passportStats(days(32, () => 400), "2026-01-28", "2026-02-28");
    const none = readiness(stats, {});
    expect(none.items.filter((i) => i.auto && i.passed)).toHaveLength(3);
    expect(none.ready).toBe(false);
    expect(none.percent).toBe(50);
    const all = readiness(stats, { id_proof: true, vending_proof_or_lor: true, bank_or_upi: true });
    expect(all.ready).toBe(true);
    expect(all.percent).toBe(100);
    const few = readiness(passportStats(days(10, () => 400), "2026-02-19", "2026-02-28"), {});
    expect(few.items.find((i) => i.key === "logged_days")!.passed).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { beforeAfter, dayMetrics, followedPlan } from "@/server/services/money";

describe("dayMetrics", () => {
  it("computes revenue, waste, missed sales, profit", () => {
    const m = dayMetrics(
      [
        { boughtQty: 10, soldQty: 8, leftoverQty: 2, soldOut: false, buyPrice: 60, sellPrice: 90 },
        { boughtQty: 5, soldQty: 5, leftoverQty: 0, soldOut: true, buyPrice: 40, sellPrice: 60 },
      ],
      700,
    );
    expect(m.revenue).toBe(8 * 90 + 5 * 60);
    expect(m.wasteValue).toBe(2 * 60);
    expect(m.missedSales).toBeCloseTo(5 * 0.25 * 20, 5);
    expect(m.profit).toBe(m.revenue - 700);
    expect(m.wastePct).toBeCloseTo(120 / 700, 5);
    expect(m.soldOutRate).toBe(0.5);
  });
  it("handles zero purchase cost", () => {
    expect(dayMetrics([], 0).wastePct).toBe(0);
  });
});

describe("followedPlan", () => {
  it("uses the 15% majority rule", () => {
    expect(followedPlan([{ bought: 10, recommended: 10 }, { bought: 11, recommended: 10 }, { bought: 30, recommended: 10 }])).toBe(true);
    expect(followedPlan([{ bought: 20, recommended: 10 }, { bought: 11, recommended: 10 }, { bought: 30, recommended: 10 }])).toBe(false);
    expect(followedPlan([{ bought: 11.5, recommended: 10 }])).toBe(true);
    expect(followedPlan([{ bought: 11.6, recommended: 10 }])).toBe(false);
    expect(followedPlan([])).toBe(false);
  });
});

describe("beforeAfter", () => {
  const day = (i: number, followed: boolean, wastePct: number, profit: number) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, followed, wastePct, profit, soldOutRate: 0.1 });
  it("compares followed vs not followed", () => {
    const r = beforeAfter([day(0, false, 0.2, 100), day(1, false, 0.16, 120), day(2, true, 0.06, 200), day(3, true, 0.08, 220)]);
    expect(r.mode).toBe("followed");
    expect(r.before.avgWastePct).toBeCloseTo(0.18);
    expect(r.after.avgWastePct).toBeCloseTo(0.07);
    expect(r.after.avgProfit).toBe(210);
  });
  it("falls back to first 7 days when nothing is followed", () => {
    const days = Array.from({ length: 12 }, (_, i) => day(i, false, i < 7 ? 0.2 : 0.1, 100));
    const r = beforeAfter(days);
    expect(r.mode).toBe("first7");
    expect(r.before.days).toBe(7);
    expect(r.after.days).toBe(5);
  });
  it("reports none with too little data", () => {
    expect(beforeAfter([day(0, false, 0.1, 1)]).mode).toBe("none");
  });
});

import { describe, expect, it } from "vitest";
import { CR_MAX, CR_MIN, SOLD_OUT_UPLIFT } from "@/server/config/constants";
import { adjustedDemand, contextMultiplier, criticalRatio, inverseNormalCdf, planItem, roundToStep, weightedBase, type HistoryDay } from "@/server/services/forecast";

const item = { id: "i1", buyPrice: 60, sellPrice: 90, unitStep: 0.5, categorySlug: "mango" };
const hist = (n: number, sold = 10, soldOut = false): HistoryDay[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 5 + i));
    return { date: d.toISOString().slice(0, 10), sold, soldOut };
  });
const none = { rain: false, festival: false, paydayWeek: false };

describe("inverse normal CDF", () => {
  it("matches known quantiles", () => {
    expect(inverseNormalCdf(0.5)).toBeCloseTo(0, 6);
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.95996, 3);
    expect(inverseNormalCdf(0.1)).toBeCloseTo(-1.28155, 3);
  });
});

describe("cold start", () => {
  it("uses the stall baseline with low confidence when < 3 closed days", () => {
    const p = planItem({ item, stall: "fruit", history: hist(2), closedDays: 2, targetDate: "2026-01-20", ctx: none });
    expect(p.confidence).toBe("low");
    expect(p.reason_codes).toContain("FEW_DATA");
    expect(p.demand).toBeCloseTo(12, 5); // DEFAULT_BASELINE.fruit.mango
  });
});

describe("history", () => {
  it("applies the sold-out uplift only when sold out", () => {
    expect(adjustedDemand(10, true)).toBeCloseTo(10 * SOLD_OUT_UPLIFT);
    expect(adjustedDemand(10, false)).toBe(10);
    const a = weightedBase(hist(8, 10, true), "2026-01-20");
    const b = weightedBase(hist(8, 10, false), "2026-01-20");
    expect(a / b).toBeCloseTo(SOLD_OUT_UPLIFT, 5);
  });
  it("weights the same weekday double", () => {
    const h: HistoryDay[] = [
      { date: "2026-01-05", sold: 100, soldOut: false }, // Monday
      { date: "2026-01-06", sold: 0, soldOut: false }, // Tuesday
    ];
    expect(weightedBase(h, "2026-01-12")).toBeCloseTo((2 * 0.9 * 100) / (2 * 0.9 + 1), 5);
  });
  it("confidence tiers", () => {
    expect(planItem({ item, stall: "fruit", history: hist(5), closedDays: 5, targetDate: "2026-02-01", ctx: none }).confidence).toBe("medium");
    expect(planItem({ item, stall: "fruit", history: hist(8), closedDays: 9, targetDate: "2026-02-01", ctx: none }).confidence).toBe("high");
  });
});

describe("context multipliers", () => {
  it("rain lowers fruit/veg/juice and raises tea_snacks", () => {
    const rain = { ...none, rain: true };
    expect(contextMultiplier(rain, "fruit")).toBe(0.8);
    expect(contextMultiplier(rain, "vegetable")).toBe(0.8);
    expect(contextMultiplier(rain, "juice")).toBe(0.8);
    expect(contextMultiplier(rain, "tea_snacks")).toBe(1.1);
  });
  it("festival and payday stack", () => {
    expect(contextMultiplier({ rain: false, festival: true, paydayWeek: true }, "fruit")).toBeCloseTo(1.3 * 1.1);
  });
  it("rain changes the plan and adds a reason", () => {
    const base = planItem({ item, stall: "fruit", history: hist(8), closedDays: 8, targetDate: "2026-02-01", ctx: none });
    const rain = planItem({ item, stall: "fruit", history: hist(8), closedDays: 8, targetDate: "2026-02-01", ctx: { ...none, rain: true } });
    expect(rain.recommended).toBeLessThan(base.recommended);
    expect(rain.reason_codes).toContain("RAIN_DOWN");
    const tea = planItem({ item: { ...item, categorySlug: "tea", unitStep: 1 }, stall: "tea_snacks", history: hist(8), closedDays: 8, targetDate: "2026-02-01", ctx: { ...none, rain: true } });
    expect(tea.reason_codes).toContain("RAIN_UP");
  });
});

describe("newsvendor", () => {
  it("clamps the critical ratio to [0.30, 0.90]", () => {
    expect(criticalRatio(100, 1)).toBe(CR_MAX);
    expect(criticalRatio(11, 10)).toBe(CR_MIN);
    expect(criticalRatio(5, 10)).toBe(CR_MIN);
    expect(criticalRatio(90, 60)).toBeCloseTo(30 / 90 > CR_MIN ? 30 / 90 : CR_MIN, 5);
  });
  it("rounds to the unit step and never goes negative", () => {
    expect(roundToStep(12.26, 0.5)).toBe(12.5);
    expect(roundToStep(12.2, 0.5)).toBe(12);
    expect(roundToStep(7.4, 1)).toBe(7);
    expect(roundToStep(-3, 1)).toBe(0);
    const p = planItem({ item, stall: "fruit", history: hist(8, 9.3), closedDays: 8, targetDate: "2026-02-01", ctx: none });
    expect((p.recommended * 2) % 1).toBe(0);
    expect(p.low).toBeGreaterThanOrEqual(0);
    expect(p.low).toBeLessThanOrEqual(p.recommended);
    expect(p.high).toBeGreaterThanOrEqual(p.recommended);
  });
  it("buys more of high-margin items than low-margin ones", () => {
    const hi = planItem({ item: { ...item, buyPrice: 10, sellPrice: 100 }, stall: "fruit", history: hist(8), closedDays: 8, targetDate: "2026-02-01", ctx: none });
    const lo = planItem({ item: { ...item, buyPrice: 90, sellPrice: 100 }, stall: "fruit", history: hist(8), closedDays: 8, targetDate: "2026-02-01", ctx: none });
    expect(hi.recommended).toBeGreaterThan(lo.recommended);
  });
  it("caps at 3x base", () => {
    const p = planItem({ item: { ...item, buyPrice: 1, sellPrice: 1000 }, stall: "fruit", history: hist(8, 10), closedDays: 8, targetDate: "2026-02-01", ctx: none });
    expect(p.recommended).toBeLessThanOrEqual(3 * p.demand + 0.5);
  });
});

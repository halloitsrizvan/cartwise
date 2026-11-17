import { describe, expect, it } from "vitest";
import { reliability } from "@/server/services/reliability";

describe("reliability", () => {
  it("rewards records, daily closing, steadiness and low waste", () => {
    const top = reliability({ loggedDays: 40, closedRatio: 1, consistency: "Steady", avgWastePct: 0.04 });
    expect(top.score).toBeGreaterThanOrEqual(95);
    expect(top.badges).toEqual(["days30", "steady", "low_waste", "closes_daily"]);
  });
  it("ranks a new, wasteful, irregular vendor lower", () => {
    const low = reliability({ loggedDays: 3, closedRatio: 0.5, consistency: "Variable", avgWastePct: 0.3 });
    expect(low.score).toBeLessThan(35);
    expect(low.badges).toEqual([]);
  });
  it("is bounded 0..100 and ignores income", () => {
    const r = reliability({ loggedDays: 999, closedRatio: 5, consistency: "Growing", avgWastePct: -1 });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

import { describe, expect, it } from "vitest";
import { matchOffers } from "@/server/services/offers";

const now = new Date("2026-03-01T10:00:00Z");
const offer = (id: string, cat: string, price: number, over: Partial<{ area: string; status: string; validFrom: Date; validTo: Date }> = {}) => ({
  id, categorySlug: cat, price, area: "Ernakulam", status: "active",
  validFrom: new Date("2026-02-01T00:00:00Z"), validTo: new Date("2026-04-01T00:00:00Z"), ...over,
});
const items = [
  { id: "m", categorySlug: "mango", buyPrice: 60 },
  { id: "b", categorySlug: "banana", buyPrice: 40 },
];
const rec = { m: 10, b: 20 };

describe("matchOffers", () => {
  it("computes saving = (buy - offer) * recommended and sorts descending", () => {
    const r = matchOffers(items, [offer("o1", "mango", 50), offer("o2", "banana", 30)], "Ernakulam", rec, now);
    expect(r.map((x) => x.offer.id)).toEqual(["o2", "o1"]);
    expect(r[0].saving).toBe(200);
    expect(r[1].saving).toBe(100);
  });
  it("drops non-positive savings, wrong area, expired, future and removed offers", () => {
    const r = matchOffers(items, [
      offer("pricier", "mango", 70),
      offer("wrongarea", "mango", 40, { area: "Kochi" }),
      offer("expired", "mango", 40, { validTo: new Date("2026-02-15T00:00:00Z") }),
      offer("future", "mango", 40, { validFrom: new Date("2026-03-15T00:00:00Z") }),
      offer("removed", "mango", 40, { status: "removed" }),
      offer("nocat", "tomato", 1),
    ], "Ernakulam", rec, now);
    expect(r).toHaveLength(0);
  });
  it("matches area case-insensitively and caps at 5", () => {
    const many = Array.from({ length: 9 }, (_, i) => offer(`o${i}`, "mango", 50 - i));
    const r = matchOffers(items, many, "  ernakulam ", rec, now);
    expect(r).toHaveLength(5);
    expect(r[0].offer.id).toBe("o8");
  });
});

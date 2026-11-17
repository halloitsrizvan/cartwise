/** Parallel close-day requests must produce exactly one set of writes. Real DB. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toDbDate, todayIST } from "@/server/lib/dates";
import { prisma } from "@/server/lib/prisma";
import { dayService } from "@/server/services/day.service";

const vendorId = randomUUID();
const itemIds: string[] = [];
const payload = (cost = 600) => ({
  items: itemIds.map((item_id, i) => ({ item_id, bought_qty: 10 + i, leftover_qty: 1, sold_out: i === 0 })),
  purchase_cost: cost,
});

beforeAll(async () => {
  await prisma.profile.create({ data: { id: vendorId, role: "vendor", name: "Concurrency", phone: `7${Date.now().toString().slice(-9)}`, area: "TestArea", vendor: { create: { stallType: "fruit", area: "TestArea", onboarded: true } } } });
  for (const [i, slug] of ["mango", "banana", "apple"].entries()) {
    const it = await prisma.item.create({ data: { vendorId, nameMl: slug, nameEn: slug, unit: "kg", unitStep: 0.5, buyPrice: 40, sellPrice: 60, categorySlug: slug, sortOrder: i } });
    itemIds.push(it.id);
  }
  const day = await prisma.dayLog.create({ data: { vendorId, date: toDbDate(todayIST()) } });
  await prisma.saleEvent.createMany({ data: itemIds.map((itemId, i) => ({ dayLogId: day.id, itemId, qty: 5 + i, ts: new Date(), clientId: `c-${vendorId}-${i}` })) });
});

afterAll(async () => {
  await prisma.profile.delete({ where: { id: vendorId } });
  await prisma.$disconnect();
});

describe("close day", () => {
  it("parallel identical requests write exactly one set of rows", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => dayService.close(vendorId, payload())));
    expect(results.filter((r) => !r.idempotent)).toHaveLength(1);
    expect(results.filter((r) => r.idempotent)).toHaveLength(5);
    const day = await prisma.dayLog.findUniqueOrThrow({ where: { vendorId_date: { vendorId, date: toDbDate(todayIST()) } } });
    expect(day.status).toBe("closed");
    expect(await prisma.dayItemSummary.count({ where: { dayLogId: day.id } })).toBe(itemIds.length);
    expect(await prisma.plan.count({ where: { vendorId } })).toBe(1); // tomorrow's plan, once
    const s = await prisma.dayItemSummary.findMany({ where: { dayLogId: day.id }, orderBy: { soldQty: "asc" } });
    expect(s.map((x) => x.soldQty)).toEqual([5, 6, 7]);
  });
  it("replaying the same payload later returns 200 (idempotent)", async () => {
    const r = await dayService.close(vendorId, payload());
    expect(r.idempotent).toBe(true);
  });
  it("a different payload is rejected with 409", async () => {
    await expect(dayService.close(vendorId, payload(999))).rejects.toMatchObject({ status: 409 });
  });
});

/**
 * API tests: real route handlers + real DB (Prisma), auth identity mocked.
 * Covers auth/ownership: a vendor cannot touch another vendor's data, a non-approved
 * market cannot post offers, roles are enforced, share links are private and revocable.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ current: null as null | { id: string; role: string } }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));
vi.mock("@/server/lib/auth", async () => {
  const { AppError } = await import("@/server/lib/errors");
  const { prisma } = await import("@/server/lib/prisma");
  const load = async () => {
    if (!auth.current) throw AppError.unauthorized();
    const p = await prisma.profile.findUnique({ where: { id: auth.current.id } });
    if (!p) throw AppError.unauthorized();
    return p;
  };
  return {
    requireUser: load,
    requireRole: async (...roles: string[]) => {
      const p = await load();
      if (!roles.includes(p.role)) throw AppError.forbidden();
      return p;
    },
  };
});
vi.spyOn(console, "error").mockImplementation(() => {});

import { prisma } from "@/server/lib/prisma";
import { toDbDate, todayIST } from "@/server/lib/dates";
import { DELETE as voidSale } from "@/app/api/v1/day/sales/[id]/route";
import { POST as addSales } from "@/app/api/v1/day/sales/route";
import { GET as listItems } from "@/app/api/v1/items/route";
import { PATCH as patchItem } from "@/app/api/v1/items/[id]/route";
import { POST as postOffer } from "@/app/api/v1/market/offers/route";
import { GET as officerOverview } from "@/app/api/v1/officer/overview/route";
import { POST as createShare } from "@/app/api/v1/passport/share/route";
import { DELETE as revokeShare } from "@/app/api/v1/passport/share/[id]/route";
import { GET as publicPassport } from "@/app/api/v1/public/passport/[token]/route";

const tag = randomUUID().slice(0, 8);
const ids = { a: randomUUID(), b: randomUUID(), market: randomUUID(), officer: randomUUID() };
let itemA = "";
let itemB = "";
let saleB = "";

const req = (method: string, body?: unknown) => new Request("http://localhost/api", { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "x-forwarded-for": `test-${tag}` } });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
const as = (id: string, role: string) => (auth.current = { id, role });

beforeAll(async () => {
  const vendor = (id: string, n: string) =>
    prisma.profile.create({ data: { id, role: "vendor", name: `Test ${n}`, phone: `8${tag.replace(/\D/g, "").padEnd(9, "1").slice(0, 8)}${n === "A" ? 1 : 2}`, area: "TestArea", vendor: { create: { stallType: "fruit", area: "TestArea", onboarded: true } } } });
  await vendor(ids.a, "A");
  await vendor(ids.b, "B");
  const mk = (vendorId: string, name: string) => prisma.item.create({ data: { vendorId, nameMl: name, nameEn: name, emoji: "🥭", unit: "kg", unitStep: 1, buyPrice: 10, sellPrice: 20, categorySlug: "mango" } });
  itemA = (await mk(ids.a, "A-mango")).id;
  itemB = (await mk(ids.b, "B-mango")).id;
  const day = await prisma.dayLog.create({ data: { vendorId: ids.b, date: toDbDate(todayIST()) } });
  saleB = (await prisma.saleEvent.create({ data: { dayLogId: day.id, itemId: itemB, qty: 3, ts: new Date(), clientId: `b-${tag}` } })).id;
  await prisma.profile.create({ data: { id: ids.market, role: "market", name: "M", email: `m-${tag}@test.local`, market: { create: { marketName: `Mkt ${tag}`, area: "TestArea", approved: false } } } });
  await prisma.profile.create({ data: { id: ids.officer, role: "officer", name: "O", email: `o-${tag}@test.local` } });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.rateLimit.deleteMany({ where: { key: { contains: tag } } });
  await prisma.$disconnect();
});

describe("authentication and roles", () => {
  it("rejects anonymous requests with 401", async () => {
    auth.current = null;
    expect((await listItems(req("GET"))).status).toBe(401);
  });
  it("rejects a vendor on officer and market routes with 403", async () => {
    as(ids.a, "vendor");
    expect((await officerOverview(req("GET"))).status).toBe(403);
    expect((await postOffer(req("POST", {}))).status).toBe(403);
  });
});

describe("vendor ownership", () => {
  it("lists only my own items", async () => {
    as(ids.a, "vendor");
    const body = await (await listItems(req("GET"))).json();
    expect(body.data.map((i: { id: string }) => i.id)).toEqual([itemA]);
  });
  it("cannot void another vendor's sale", async () => {
    as(ids.a, "vendor");
    const res = await voidSale(req("DELETE"), ctx({ id: saleB }));
    expect(res.status).toBe(404);
    expect((await prisma.saleEvent.findUnique({ where: { id: saleB } }))!.voided).toBe(false);
  });
  it("cannot edit another vendor's item", async () => {
    as(ids.a, "vendor");
    const res = await patchItem(req("PATCH", { sell_price: 999 }), ctx({ id: itemB }));
    expect(res.status).toBe(404);
    expect((await prisma.item.findUnique({ where: { id: itemB } }))!.sellPrice).toBe(20);
  });
  it("cannot log a sale against another vendor's item", async () => {
    as(ids.a, "vendor");
    const res = await addSales(req("POST", { events: [{ client_id: `x-${tag}-1234`, item_id: itemB, qty: 1, ts: new Date().toISOString() }] }));
    expect(res.status).toBe(404);
  });
  it("rejects unknown fields (mass assignment) with 400", async () => {
    as(ids.a, "vendor");
    const res = await patchItem(req("PATCH", { sell_price: 25, vendor_id: ids.b }), ctx({ id: itemA }));
    expect(res.status).toBe(400);
  });
  it("sale sync is idempotent on client_id", async () => {
    as(ids.a, "vendor");
    const ev = { client_id: `idem-${tag}-0001`, item_id: itemA, qty: 2, ts: new Date().toISOString() };
    const r1 = await (await addSales(req("POST", { events: [ev] }))).json();
    const r2 = await (await addSales(req("POST", { events: [ev, ev] }))).json();
    expect(r1.data.inserted).toBe(1);
    expect(r2.data.inserted).toBe(0);
    expect(await prisma.saleEvent.count({ where: { clientId: ev.client_id } })).toBe(1);
  });
});

describe("market approval", () => {
  it("a market that is not approved gets 403 on POST market/offers", async () => {
    as(ids.market, "market");
    const offer = { category_slug: "mango", title_ml: "മാങ്ങ", title_en: "Mango", price: 40, unit: "kg", qty_available: 100, valid_from: new Date().toISOString(), valid_to: new Date(Date.now() + 86_400_000).toISOString(), area: "TestArea" };
    expect((await postOffer(req("POST", offer))).status).toBe(403);
    await prisma.market.update({ where: { profileId: ids.market }, data: { approved: true } });
    expect((await postOffer(req("POST", offer))).status).toBe(201);
  });
});

describe("share links", () => {
  it("stores only a hash, hides phone and area, and 404s once revoked", async () => {
    as(ids.a, "vendor");
    const created = await (await createShare(req("POST", {}))).json();
    const token = created.data.url.split("/p/")[1];
    const row = await prisma.shareLink.findUnique({ where: { id: created.data.id } });
    expect(row!.tokenHash).not.toContain(token);
    expect(row!.tokenHash).toHaveLength(64);

    auth.current = null;
    const pub = await publicPassport(req("GET"), ctx({ token }));
    expect(pub.status).toBe(200);
    expect(pub.headers.get("x-robots-tag")).toContain("noindex");
    const json = JSON.stringify(await pub.json());
    expect(json).not.toMatch(/phone|TestArea|area/i);

    as(ids.a, "vendor");
    expect((await revokeShare(req("DELETE"), ctx({ id: created.data.id }))).status).toBe(200);
    auth.current = null;
    expect((await publicPassport(req("GET"), ctx({ token }))).status).toBe(404);
  });
  it("another vendor cannot revoke my link", async () => {
    as(ids.a, "vendor");
    const created = await (await createShare(req("POST", {}))).json();
    as(ids.b, "vendor");
    expect((await revokeShare(req("DELETE"), ctx({ id: created.data.id }))).status).toBe(404);
  });
  it("unknown tokens 404", async () => {
    auth.current = null;
    expect((await publicPassport(req("GET"), ctx({ token: "x".repeat(43) }))).status).toBe(404);
  });
});

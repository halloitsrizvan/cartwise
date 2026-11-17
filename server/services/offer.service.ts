import type { z } from "zod";
import type { OfferInputSchema, OfferPatchSchema } from "@/shared/schemas/domain";
import { audit } from "../lib/audit";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { vendorRepository } from "../repositories/vendor.repository";
import { matchOffers } from "./offers";
import { planService } from "./plan.service";

const dto = (o: {
  id: string;
  categorySlug: string;
  titleMl: string;
  titleEn: string;
  price: number;
  unit: string;
  qtyAvailable: number;
  validFrom: Date;
  validTo: Date;
  area: string;
  status: string;
  reportCount: number;
}) => ({
  id: o.id,
  category_slug: o.categorySlug,
  title_ml: o.titleMl,
  title_en: o.titleEn,
  price: o.price,
  unit: o.unit,
  qty_available: o.qtyAvailable,
  valid_from: o.validFrom.toISOString(),
  valid_to: o.validTo.toISOString(),
  area: o.area,
  status: o.status,
  report_count: o.reportCount,
});

export const offerService = {
  /** Vendor feed (LOGIC 10). */
  async feed(vendorId: string) {
    const v = await vendorRepository.getWithProfile(vendorId);
    if (!v) throw AppError.notFound("Vendor not found");
    const now = new Date();
    const [items, offers, plan, seen] = await Promise.all([
      vendorRepository.listItems(vendorId),
      prisma.offer.findMany({
        where: { status: "active", validFrom: { lte: now }, validTo: { gte: now }, market: { approved: true } },
        include: { market: { include: { profile: true } } },
      }),
      planService.tomorrow(vendorId),
      prisma.offerView.findMany({ where: { vendorId }, select: { offerId: true } }),
    ]);
    const rec: Record<string, number> = Object.fromEntries(plan.lines.map((l) => [l.item_id, l.chosen_qty]));
    const matches = matchOffers(items, offers, v.area, rec, now);
    const seenSet = new Set(seen.map((s) => s.offerId));
    return matches.map((m) => {
      const it = items.find((i) => i.id === m.itemId)!;
      return {
        ...dto(m.offer),
        saving: m.saving,
        recommended_qty: m.recommendedQty,
        item: { id: it.id, name_ml: it.nameMl, name_en: it.nameEn, emoji: it.emoji, buy_price: it.buyPrice },
        market: {
          name: m.offer.market.marketName,
          area: m.offer.market.area,
          phone: m.offer.market.profile.phone,
        },
        seen: seenSet.has(m.offer.id),
      };
    });
  },

  async markSeen(vendorId: string, offerId: string) {
    const o = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!o) throw AppError.notFound("Offer not found");
    await prisma.offerView.upsert({ where: { offerId_vendorId: { offerId, vendorId } }, create: { offerId, vendorId }, update: {} });
    return { id: offerId, seen: true };
  },

  async report(offerId: string) {
    const o = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!o) throw AppError.notFound("Offer not found");
    const updated = await prisma.offer.update({
      where: { id: offerId },
      data: { reportCount: { increment: 1 }, ...(o.reportCount + 1 >= 3 ? { status: "reported" } : {}) },
    });
    return { id: offerId, report_count: updated.reportCount };
  },

  // ---- market side ----
  async listMine(marketId: string) {
    const rows = await prisma.offer.findMany({ where: { marketId, status: { not: "removed" } }, orderBy: { createdAt: "desc" }, include: { _count: { select: { views: true } } } });
    const now = new Date();
    return rows.map((o) => ({ ...dto(o), status: o.status === "active" && o.validTo < now ? "expired" : o.status, views: o._count.views }));
  },

  async create(marketId: string, input: z.infer<typeof OfferInputSchema>) {
    const m = await prisma.market.findUnique({ where: { profileId: marketId } });
    if (!m?.approved) throw AppError.forbidden("Market is not approved yet");
    if (new Date(input.valid_to) <= new Date(input.valid_from)) throw AppError.badRequest("valid_to must be after valid_from");
    const o = await prisma.offer.create({
      data: {
        marketId,
        categorySlug: input.category_slug,
        titleMl: input.title_ml,
        titleEn: input.title_en,
        price: input.price,
        unit: input.unit,
        qtyAvailable: input.qty_available,
        validFrom: new Date(input.valid_from),
        validTo: new Date(input.valid_to),
        area: input.area,
      },
    });
    return dto(o);
  },

  async patch(marketId: string, id: string, input: z.infer<typeof OfferPatchSchema>) {
    const res = await prisma.offer.updateMany({
      where: { id, marketId },
      data: {
        categorySlug: input.category_slug,
        titleMl: input.title_ml,
        titleEn: input.title_en,
        price: input.price,
        unit: input.unit,
        qtyAvailable: input.qty_available,
        validFrom: input.valid_from ? new Date(input.valid_from) : undefined,
        validTo: input.valid_to ? new Date(input.valid_to) : undefined,
        area: input.area,
        status: input.status,
      },
    });
    if (res.count === 0) throw AppError.notFound("Offer not found");
    return dto((await prisma.offer.findUnique({ where: { id } }))!);
  },

  async stats(marketId: string) {
    const now = new Date();
    const offers = await prisma.offer.findMany({ where: { marketId, status: "active", validTo: { gte: now }, validFrom: { lte: now } } });
    const views = await prisma.offerView.count({ where: { offer: { marketId } } });
    // reach = distinct vendors in the offer area who sell the offered category
    const vendorIds = new Set<string>();
    for (const o of offers) {
      const vs = await prisma.vendor.findMany({
        where: { area: { equals: o.area, mode: "insensitive" }, items: { some: { categorySlug: o.categorySlug, active: true } } },
        select: { profileId: true },
      });
      vs.forEach((v) => vendorIds.add(v.profileId));
    }
    const m = await prisma.market.findUnique({ where: { profileId: marketId } });
    return { offers_live: offers.length, vendors_reached: vendorIds.size, views, approved: !!m?.approved, market_name: m?.marketName ?? "" };
  },

  async marketsForOfficer() {
    const rows = await prisma.market.findMany({ orderBy: { createdAt: "desc" }, include: { profile: true } });
    return rows.map((m) => ({
      id: m.profileId,
      market_name: m.marketName,
      area: m.area,
      email: m.profile.email,
      approved: m.approved,
      approved_at: m.approvedAt?.toISOString() ?? null,
    }));
  },

  async approveMarket(officerId: string, id: string, approved: boolean) {
    const res = await prisma.market.updateMany({
      where: { profileId: id },
      data: { approved, approvedBy: approved ? officerId : null, approvedAt: approved ? new Date() : null },
    });
    if (res.count === 0) throw AppError.notFound("Market not found");
    await audit(officerId, approved ? "market.approve" : "market.reject", "market", id);
    return { id, approved };
  },
};

import type { z } from "zod";
import type { NoticeInputSchema, NoticePatchSchema } from "@/shared/schemas/domain";
import { audit } from "../lib/audit";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

const dto = (n: { id: string; titleMl: string; titleEn: string; bodyMl: string; bodyEn: string; schemeTag: string; areaFilter: string | null; publishedAt: Date }) => ({
  id: n.id,
  title_ml: n.titleMl,
  title_en: n.titleEn,
  body_ml: n.bodyMl,
  body_en: n.bodyEn,
  scheme_tag: n.schemeTag,
  area_filter: n.areaFilter,
  published_at: n.publishedAt.toISOString(),
});

export const noticeService = {
  async listForVendor(vendorId: string) {
    const v = await prisma.vendor.findUnique({ where: { profileId: vendorId } });
    const area = v?.area ?? "";
    const rows = await prisma.notice.findMany({
      where: { OR: [{ areaFilter: null }, { areaFilter: "" }, { areaFilter: { equals: area, mode: "insensitive" } }] },
      orderBy: { publishedAt: "desc" },
      take: 50,
      include: { reads: { where: { vendorId }, select: { id: true } } },
    });
    return rows.map((n) => ({ ...dto(n), read: n.reads.length > 0 }));
  },

  async markRead(vendorId: string, noticeId: string) {
    const n = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (!n) throw AppError.notFound("Notice not found");
    await prisma.noticeRead.upsert({
      where: { noticeId_vendorId: { noticeId, vendorId } },
      create: { noticeId, vendorId },
      update: {},
    });
    return { id: noticeId, read: true };
  },

  async listForOfficer() {
    const rows = await prisma.notice.findMany({ orderBy: { publishedAt: "desc" }, include: { _count: { select: { reads: true } } } });
    return rows.map((n) => ({ ...dto(n), read_count: n._count.reads }));
  },

  async create(officerId: string, input: z.infer<typeof NoticeInputSchema>) {
    const n = await prisma.notice.create({
      data: {
        officerId,
        titleMl: input.title_ml,
        titleEn: input.title_en,
        bodyMl: input.body_ml,
        bodyEn: input.body_en,
        schemeTag: input.scheme_tag,
        areaFilter: input.area_filter || null,
      },
    });
    await audit(officerId, "notice.create", "notice", n.id);
    return dto(n);
  },

  async patch(officerId: string, id: string, input: z.infer<typeof NoticePatchSchema>) {
    const exists = await prisma.notice.findUnique({ where: { id } });
    if (!exists) throw AppError.notFound("Notice not found");
    const n = await prisma.notice.update({
      where: { id },
      data: {
        titleMl: input.title_ml,
        titleEn: input.title_en,
        bodyMl: input.body_ml,
        bodyEn: input.body_en,
        schemeTag: input.scheme_tag,
        areaFilter: input.area_filter === undefined ? undefined : input.area_filter || null,
      },
    });
    await audit(officerId, "notice.update", "notice", id);
    return dto(n);
  },
};

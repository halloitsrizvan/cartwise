import { Prisma } from "@prisma/client";
import { toDbDate } from "../lib/dates";
import { prisma } from "../lib/prisma";
import type { Db } from "./vendor.repository";

export const dayRepository = {
  /** Race-safe get-or-create of the (vendor, date) log. */
  async ensureDay(vendorId: string, date: string, defaults: Partial<{ rain: boolean; festival: boolean; paydayWeek: boolean }> = {}, db: Db = prisma) {
    const where = { vendorId_date: { vendorId, date: toDbDate(date) } };
    const found = await db.dayLog.findUnique({ where });
    if (found) return found;
    try {
      return await db.dayLog.create({ data: { vendorId, date: toDbDate(date), ...defaults } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return db.dayLog.findUniqueOrThrow({ where });
      }
      throw e;
    }
  },
  find: (vendorId: string, date: string, db: Db = prisma) =>
    db.dayLog.findUnique({ where: { vendorId_date: { vendorId, date: toDbDate(date) } } }),
  updateContext: (id: string, data: { rain?: boolean; festival?: boolean; paydayWeek?: boolean }) =>
    prisma.dayLog.update({ where: { id }, data }),

  /** Non-voided sold qty per item for one day log. */
  async soldByItem(dayLogId: string, db: Db = prisma): Promise<Record<string, number>> {
    const rows = await db.saleEvent.groupBy({ by: ["itemId"], where: { dayLogId, voided: false }, _sum: { qty: true } });
    return Object.fromEntries(rows.map((r) => [r.itemId, r._sum.qty ?? 0]));
  },

  async insertSales(dayLogId: string, events: { clientId: string; itemId: string; qty: number; ts: Date; billId?: string; payMethod?: string; unitPrice?: number }[]) {
    const res = await prisma.saleEvent.createMany({
      data: events.map((e) => ({ dayLogId, itemId: e.itemId, qty: e.qty, ts: e.ts, clientId: e.clientId, billId: e.billId, payMethod: e.payMethod, unitPrice: e.unitPrice })),
      skipDuplicates: true,
    });
    return res.count;
  },
  findSaleOwned: (vendorId: string, ref: string) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    return prisma.saleEvent.findFirst({
      where: { dayLog: { vendorId }, OR: [...(isUuid ? [{ id: ref }] : []), { clientId: ref }] },
    });
  },
  voidSale: (id: string) => prisma.saleEvent.update({ where: { id }, data: { voided: true } }),
  /** Closed dayLogs (newest first) with summaries, strictly before `before`. */
  closedDays: (vendorId: string, take: number, before?: string, db: Db = prisma) =>
    db.dayLog.findMany({
      where: { vendorId, status: "closed", ...(before ? { date: { lt: toDbDate(before) } } : {}) },
      orderBy: { date: "desc" },
      take,
      include: { summaries: true },
    }),
  countClosed: (vendorId: string, db: Db = prisma) => db.dayLog.count({ where: { vendorId, status: "closed" } }),
  firstLog: (vendorId: string) => prisma.dayLog.findFirst({ where: { vendorId }, orderBy: { date: "asc" }, select: { date: true } }),
};

import type { Prisma } from "@prisma/client";
import { toDbDate } from "../lib/dates";
import { prisma } from "../lib/prisma";
import type { Db } from "./vendor.repository";

export const planRepository = {
  find: (vendorId: string, forDate: string, db: Db = prisma) =>
    db.plan.findUnique({ where: { vendorId_forDate: { vendorId, forDate: toDbDate(forDate) } } }),
  upsert: (
    vendorId: string,
    forDate: string,
    data: { lines: Prisma.InputJsonValue; totalExpectedProfit: number; overrides?: Prisma.InputJsonValue },
    db: Db = prisma,
  ) =>
    db.plan.upsert({
      where: { vendorId_forDate: { vendorId, forDate: toDbDate(forDate) } },
      create: { vendorId, forDate: toDbDate(forDate), lines: data.lines, totalExpectedProfit: data.totalExpectedProfit, overrides: data.overrides ?? {} },
      update: { lines: data.lines, totalExpectedProfit: data.totalExpectedProfit, generatedAt: new Date(), ...(data.overrides ? { overrides: data.overrides } : {}) },
    }),
  setOverrides: (id: string, overrides: Prisma.InputJsonValue) => prisma.plan.update({ where: { id }, data: { overrides } }),
  replaceActuals: async (planId: string, rows: { itemId: string; boughtQty: number; followed: boolean }[], db: Db = prisma) => {
    await db.planActual.deleteMany({ where: { planId } });
    if (rows.length) await db.planActual.createMany({ data: rows.map((r) => ({ planId, ...r })) });
  },
  /** plan_actuals for all of a vendor's plans, keyed by plan date. */
  actualsByDate: (vendorId: string, db: Db = prisma) =>
    db.plan.findMany({ where: { vendorId }, select: { forDate: true, actuals: { select: { followed: true } } } }),
};

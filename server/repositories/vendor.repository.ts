import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type Db = PrismaClient | Prisma.TransactionClient;

export const vendorRepository = {
  getWithProfile: (vendorId: string, db: Db = prisma) =>
    db.vendor.findUnique({ where: { profileId: vendorId }, include: { profile: true } }),

  async onboard(
    vendorId: string,
    data: {
      name: string;
      language: "ml" | "en";
      stallType: "fruit" | "vegetable" | "tea_snacks" | "juice";
      area: string;
      items: Prisma.ItemCreateManyInput[];
    },
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.profile.update({ where: { id: vendorId }, data: { name: data.name, language: data.language, area: data.area } });
      await tx.vendor.update({ where: { profileId: vendorId }, data: { stallType: data.stallType, area: data.area, onboarded: true } });
      await tx.item.deleteMany({ where: { vendorId } });
      await tx.item.createMany({ data: data.items });
    });
  },

  patch: (vendorId: string, data: { name?: string; language?: "ml" | "en"; area?: string }) =>
    prisma.$transaction(async (tx) => {
      await tx.profile.update({ where: { id: vendorId }, data });
      if (data.area) await tx.vendor.update({ where: { profileId: vendorId }, data: { area: data.area } });
    }),

  listItems: (vendorId: string, includeInactive = false, db: Db = prisma) =>
    db.item.findMany({
      where: { vendorId, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  createItem: (data: Prisma.ItemUncheckedCreateInput) => prisma.item.create({ data }),
  /** Ownership enforced in the where clause. */
  updateItem: (vendorId: string, id: string, data: Prisma.ItemUpdateInput) =>
    prisma.item.updateMany({ where: { id, vendorId }, data }),
  findItem: (vendorId: string, id: string) => prisma.item.findFirst({ where: { id, vendorId } }),
  countItems: (vendorId: string) => prisma.item.count({ where: { vendorId } }),
};

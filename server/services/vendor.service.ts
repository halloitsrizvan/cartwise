import type { z } from "zod";
import type { ItemInput, ItemPatchSchema, OnboardSchema, VendorPatchSchema } from "@/shared/schemas/domain";
import { AppError } from "../lib/errors";
import { vendorRepository } from "../repositories/vendor.repository";
import { isDemoPhone, itemCreateData, itemDTO } from "./dto";

export const vendorService = {
  async me(vendorId: string) {
    const v = await vendorRepository.getWithProfile(vendorId);
    if (!v) throw AppError.notFound("Vendor not found");
    return {
      id: v.profileId,
      name: v.profile.name,
      phone: v.profile.phone,
      language: v.profile.language,
      area: v.area,
      stall_type: v.stallType,
      onboarded: v.onboarded,
      public_listed: v.publicListed,
      public_phone: v.publicPhone,
      public_place: v.publicPlace,
      upi_id: v.upiId,
      demo: process.env.DEMO_MODE === "true" && isDemoPhone(v.profile.phone),
    };
  },

  async onboard(vendorId: string, input: z.infer<typeof OnboardSchema>) {
    await vendorRepository.onboard(vendorId, {
      name: input.name,
      language: input.language,
      stallType: input.stall_type,
      area: input.area,
      items: input.items.map((i, idx) => itemCreateData(vendorId, i, idx)),
    });
    return this.me(vendorId);
  },

  async patch(vendorId: string, input: z.infer<typeof VendorPatchSchema>) {
    await vendorRepository.patch(vendorId, input);
    return this.me(vendorId);
  },

  async listItems(vendorId: string, all = false) {
    return (await vendorRepository.listItems(vendorId, all)).map(itemDTO);
  },

  async createItem(vendorId: string, input: ItemInput) {
    const idx = await vendorRepository.countItems(vendorId);
    return itemDTO(await vendorRepository.createItem(itemCreateData(vendorId, input, idx)));
  },

  async updateItem(vendorId: string, id: string, input: z.infer<typeof ItemPatchSchema>) {
    const data: Record<string, unknown> = {};
    if (input.name_ml !== undefined) data.nameMl = input.name_ml;
    if (input.name_en !== undefined) data.nameEn = input.name_en;
    if (input.emoji !== undefined) data.emoji = input.emoji;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.unit_step !== undefined) data.unitStep = input.unit_step;
    if (input.buy_price !== undefined) data.buyPrice = input.buy_price;
    if (input.sell_price !== undefined) data.sellPrice = input.sell_price;
    if (input.category_slug !== undefined) data.categorySlug = input.category_slug;
    if (input.perishable !== undefined) data.perishable = input.perishable;
    if (input.sort_order !== undefined) data.sortOrder = input.sort_order;
    if (input.active !== undefined) data.active = input.active;
    const res = await vendorRepository.updateItem(vendorId, id, data);
    if (res.count === 0) throw AppError.notFound("Item not found");
    const item = await vendorRepository.findItem(vendorId, id);
    return itemDTO(item!);
  },

  /** Soft delete. */
  async deleteItem(vendorId: string, id: string) {
    const res = await vendorRepository.updateItem(vendorId, id, { active: false });
    if (res.count === 0) throw AppError.notFound("Item not found");
    return { id, active: false };
  },
};

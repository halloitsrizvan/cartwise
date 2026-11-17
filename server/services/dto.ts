import type { Item } from "@prisma/client";
import type { ItemDTO } from "@/shared/schemas/domain";

export const itemDTO = (i: Item): ItemDTO => ({
  id: i.id,
  name_ml: i.nameMl,
  name_en: i.nameEn,
  emoji: i.emoji,
  unit: i.unit,
  unit_step: i.unitStep,
  buy_price: i.buyPrice,
  sell_price: i.sellPrice,
  category_slug: i.categorySlug,
  perishable: i.perishable,
  active: i.active,
  sort_order: i.sortOrder,
});

export const itemCreateData = (vendorId: string, i: import("@/shared/schemas/domain").ItemInput, idx = 0) => ({
  vendorId,
  nameMl: i.name_ml,
  nameEn: i.name_en,
  emoji: i.emoji,
  unit: i.unit,
  unitStep: i.unit_step,
  buyPrice: i.buy_price,
  sellPrice: i.sell_price,
  categorySlug: i.category_slug,
  perishable: i.perishable,
  sortOrder: i.sort_order ?? idx,
});

/** Seeded demo accounts (phone prefix). Used to tag numbers as demo data, never as measured results. */
export const isDemoPhone = (phone?: string | null) => !!phone && phone.startsWith("90000000");

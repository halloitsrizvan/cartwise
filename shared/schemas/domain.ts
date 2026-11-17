import { z } from "zod";

export const RoleSchema = z.enum(["vendor", "officer", "market"]);
export type Role = z.infer<typeof RoleSchema>;
export const LangSchema = z.enum(["ml", "en"]);
export type Lang = z.infer<typeof LangSchema>;
export const StallTypeSchema = z.enum(["fruit", "vegetable", "tea_snacks", "juice"]);
export type StallType = z.infer<typeof StallTypeSchema>;
export const UnitSchema = z.enum(["kg", "piece", "cup", "bundle"]);
export type Unit = z.infer<typeof UnitSchema>;

const slug = z.string().regex(/^[a-z_]{2,30}$/);
const text = (max = 120) => z.string().trim().min(1).max(max);
export const DateStr = z.iso.date();

// ---- auth ----
export const LoginSchema = z.strictObject({
  identifier: z.string().trim().min(3).max(120),
  secret: z.string().min(4).max(128),
});
export const RegisterVendorSchema = z.strictObject({
  phone: z.string().trim().regex(/^\d{10}$/, "PHONE_INVALID"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN_INVALID"),
});
export const RegisterMarketSchema = z.strictObject({
  email: z.email().max(120),
  password: z.string().min(8).max(128),
  name: text(80),
  market_name: text(100),
  area: text(80),
  phone: z.string().trim().regex(/^d{10}$/).optional(),
});
export const DemoLoginSchema = z.strictObject({ role: RoleSchema });
export const PinChangeSchema = z.strictObject({
  current_pin: z.string().regex(/^\d{4,6}$/),
  new_pin: z.string().regex(/^\d{4,6}$/),
});

// ---- items ----
export const ItemInputSchema = z.strictObject({
  name_ml: text(60),
  name_en: text(60),
  emoji: z.string().max(8).default(""),
  unit: UnitSchema,
  unit_step: z.number().positive().max(100),
  buy_price: z.number().min(0).max(100000),
  sell_price: z.number().min(0).max(100000),
  category_slug: slug,
  perishable: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(1000).optional(),
});
export type ItemInput = z.infer<typeof ItemInputSchema>;
export const ItemPatchSchema = ItemInputSchema.partial().extend({ active: z.boolean().optional() });

export const ItemDTOSchema = z
  .object({
    id: z.uuid(),
    name_ml: z.string(),
    name_en: z.string(),
    emoji: z.string(),
    unit: UnitSchema,
    unit_step: z.number(),
    buy_price: z.number(),
    sell_price: z.number(),
    category_slug: z.string(),
    perishable: z.boolean(),
    active: z.boolean(),
    sort_order: z.number(),
  })
  .meta({ id: "Item" });
export type ItemDTO = z.infer<typeof ItemDTOSchema>;

// ---- vendor ----
export const OnboardSchema = z.strictObject({
  name: text(60),
  language: LangSchema,
  stall_type: StallTypeSchema,
  area: text(80),
  items: z.array(ItemInputSchema).min(1).max(30),
});
export const VendorPatchSchema = z.strictObject({
  name: text(60).optional(),
  language: LangSchema.optional(),
  area: text(80).optional(),
});

// ---- day ----
export const ContextSchema = z.strictObject({
  rain: z.boolean().optional(),
  festival: z.boolean().optional(),
  payday_week: z.boolean().optional(),
});
export const ForQuery = z.object({ for: z.enum(["today", "tomorrow"]).default("today") });
export const SaleEventSchema = z.strictObject({
  client_id: z.string().min(8).max(64),
  item_id: z.uuid(),
  qty: z.number().positive().max(1000),
  ts: z.iso.datetime({ offset: true }),
});
export const SalesBatchSchema = z.strictObject({ events: z.array(SaleEventSchema).min(1).max(200) });
export const CloseDaySchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        item_id: z.uuid(),
        bought_qty: z.number().min(0).max(100000),
        leftover_qty: z.number().min(0).max(100000),
        sold_out: z.boolean(),
        sold_out_at: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullish(),
      }),
    )
    .max(60),
  purchase_cost: z.number().min(0).max(10000000),
});
export type CloseDayInput = z.infer<typeof CloseDaySchema>;
export const OverrideSchema = z.strictObject({ item_id: z.uuid(), chosen_qty: z.number().min(0).max(100000) });
export const RangeQuery = z.object({ range: z.enum(["7", "30"]).default("7") });

// ---- passport ----
export const SelfDeclaredSchema = z.strictObject({
  id_proof: z.boolean().optional(),
  vending_proof_or_lor: z.boolean().optional(),
  bank_or_upi: z.boolean().optional(),
});
export const ShareCreateSchema = z.strictObject({ expires_in_days: z.number().int().min(1).max(90).optional() });

// ---- officer ----
export const NoticeInputSchema = z.strictObject({
  title_ml: text(140),
  title_en: text(140),
  body_ml: text(1000),
  body_en: text(1000),
  scheme_tag: text(40),
  area_filter: z.string().trim().max(80).nullish(),
});
export const NoticePatchSchema = NoticeInputSchema.partial();
export const RegistrationPatchSchema = z.strictObject({ status: z.enum(["draft", "submitted", "approved", "rejected"]) });
export const MarketApproveSchema = z.strictObject({ approved: z.boolean() });

// ---- market ----
export const OfferInputSchema = z.strictObject({
  category_slug: slug,
  title_ml: text(140),
  title_en: text(140),
  price: z.number().min(0).max(100000),
  unit: UnitSchema,
  qty_available: z.number().min(0).max(1000000),
  valid_from: z.iso.datetime({ offset: true }),
  valid_to: z.iso.datetime({ offset: true }),
  area: text(80),
});
export const OfferPatchSchema = OfferInputSchema.partial().extend({
  status: z.enum(["active", "expired", "removed"]).optional(),
});

export type PlanLine = {
  demand?: number;
  item_id: string;
  recommended: number;
  low: number;
  high: number;
  expected_sales: number;
  expected_profit: number;
  reason_codes: string[];
  confidence: "low" | "medium" | "high";
};
export const REASON_CODES = [
  "WEEKDAY_HIGH",
  "WEEKDAY_LOW",
  "RAIN_DOWN",
  "RAIN_UP",
  "FESTIVAL_UP",
  "PAYDAY_UP",
  "SOLD_OUT_BOOST",
  "TREND_UP",
  "TREND_DOWN",
  "FEW_DATA",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

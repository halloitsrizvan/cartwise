import type { ItemDTO, PlanLine } from "@/shared/schemas/domain";

export type Me = { id: string; role: "vendor" | "admin"; name: string; language: "ml" | "en"; onboarded: boolean; approved?: boolean; demo: boolean };
export type VendorMe = { id: string; name: string; phone: string | null; language: "ml" | "en"; area: string; stall_type: "fruit" | "vegetable" | "tea_snacks" | "juice"; onboarded: boolean; demo: boolean; public_listed: boolean; public_phone: string | null; public_place: string | null; upi_id: string | null };
export type DaySummary = { revenue: number; waste_value: number; missed_sales_estimate: number; profit: number; waste_pct: number; purchase_cost: number };
export type TodayItem = ItemDTO & { sold_qty: number };
export type Today = {
  date: string;
  log: { id: string; rain: boolean; festival: boolean; payday_week: boolean; status: "open" | "closed"; purchase_cost: number };
  items: TodayItem[];
  totals: { revenue: number; sold_count: number };
  summary: DaySummary | null;
  plan_today: { total_expected_profit: number };
};
export type PlanViewLine = PlanLine & { item: ItemDTO; overridden: boolean; chosen_qty: number; effective_profit: number };
export type PlanView = {
  for_date: string;
  weekday: number;
  context: { rain: boolean; festival: boolean; payday_week: boolean };
  lines: PlanViewLine[];
  total_spend: number;
  total_expected_profit: number;
  confidence: "low" | "medium" | "high";
  generated_at: string;
};
export type MoneySummary = {
  range: 7 | 30;
  days: { date: string; revenue: number; profit: number; waste_value: number; missed_sales: number; followed: boolean }[];
  totals: { profit: number; avg_profit: number; waste_value: number; missed_sales: number; closed_days: number };
};
export type GroupStats = { days: number; avgWastePct: number; avgProfit: number; soldOutRate: number };
export type BeforeAfter = { mode: "followed" | "first7" | "none"; before: GroupStats; after: GroupStats; demo: boolean };
export type Statement = {
  name: string;
  stall_type: string;
  period_from: string | null;
  period_to: string | null;
  avg_daily_profit: number;
  active_days: number;
  logged_days: number;
  closed_ratio: number;
  consistency: "Steady" | "Growing" | "Variable";
  generated_at: string;
  generated_by: string;
  demo: boolean;
};
export type PublicStatement = Omit<Statement, "name" | "logged_days" | "closed_ratio"> & { first_name: string };
export type Readiness = {
  items: { key: string; auto: boolean; passed: boolean; detail?: string }[];
  passed: number;
  total: number;
  percent: number;
  ready: boolean;
  registration_status: string;
  indicative: boolean;
};
export type ShareLinkRow = { id: string; created_at: string; expires_at: string; active: boolean };
export type NoticeRow = { id: string; title_ml: string; title_en: string; body_ml: string; body_en: string; scheme_tag: string; area_filter: string | null; published_at: string; read: boolean; read_count?: number };
export type AdminOverview = {
  kpis: { active_vendors: number; total_vendors: number; avg_waste_reduction_pts: number; avg_daily_income: number; ready_vendors: number };
  trend: { date: string; avg_waste_pct: number; avg_profit: number }[];
  area_breakdown: { area: string; vendors: number; avg_daily_profit: number; avg_waste_pct: number }[];
  demo: boolean;
};
export type AdminVendor = { id: string; name: string; area: string; stall_type: string; readiness_percent: number; logged_days: number; avg_daily_profit: number; registration_status: string };
export type AppSummary = {
  simulated: true; registration_id: string; scheme: string; status: string;
  applicant: { name: string; phone: string | null; area: string; stall_type: string; language: string };
  income: { avg_daily_profit: number; active_days: number; logged_days: number; closed_ratio: number; consistency: string };
  readiness: Omit<Readiness, "registration_status" | "indicative">;
  self_declared: Record<string, boolean>;
  updated_at: string;
};
export type PublicVendor = {
  id: string; first_name: string; stall_type: string; area: string; place: string | null;
  score: number; badges: string[]; days_active: number; rank: number;
};
export type PublicVendorProfile = PublicVendor & { phone: string | null; consistency: string; items: { name_ml: string; name_en: string; emoji: string }[] };
export type PaymentLine = { item_id: string; name_ml: string; name_en: string; emoji: string; unit: string; qty: number; price: number; amount: number };
export type PaymentBill = { id: string; date: string; ts: string; method: "cash" | "upi" | null; legacy: boolean; total: number; lines: PaymentLine[] };
export type Payments = {
  range: number;
  totals: { total: number; cash: number; upi: number; other: number; bills: number };
  days: { date: string; total: number; bills: PaymentBill[] }[];
};

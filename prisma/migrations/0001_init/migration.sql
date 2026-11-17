-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('vendor', 'officer', 'market');

-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('ml', 'en');

-- CreateEnum
CREATE TYPE "StallType" AS ENUM ('fruit', 'vegetable', 'tea_snacks', 'juice');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('kg', 'piece', 'cup', 'bundle');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('active', 'expired', 'reported', 'removed');

-- CreateEnum
CREATE TYPE "RegStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "role" "user_role" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "language" "Lang" NOT NULL DEFAULT 'ml',
    "area" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "profile_id" UUID NOT NULL,
    "stall_type" "StallType" NOT NULL,
    "area" TEXT NOT NULL,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "name_ml" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '',
    "unit" "Unit" NOT NULL,
    "unit_step" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "buy_price" DOUBLE PRECISION NOT NULL,
    "sell_price" DOUBLE PRECISION NOT NULL,
    "category_slug" TEXT NOT NULL,
    "perishable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_logs" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "rain" BOOLEAN NOT NULL DEFAULT false,
    "festival" BOOLEAN NOT NULL DEFAULT false,
    "payday_week" BOOLEAN NOT NULL DEFAULT false,
    "status" "DayStatus" NOT NULL DEFAULT 'open',
    "purchase_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "close_payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_events" (
    "id" UUID NOT NULL,
    "day_log_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "client_id" TEXT NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_item_summaries" (
    "day_log_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "bought_qty" DOUBLE PRECISION NOT NULL,
    "sold_qty" DOUBLE PRECISION NOT NULL,
    "leftover_qty" DOUBLE PRECISION NOT NULL,
    "sold_out" BOOLEAN NOT NULL DEFAULT false,
    "sold_out_at" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_item_summaries_pkey" PRIMARY KEY ("day_log_id","item_id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "for_date" DATE NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lines" JSONB NOT NULL,
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "total_expected_profit" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_actuals" (
    "plan_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "bought_qty" DOUBLE PRECISION NOT NULL,
    "followed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_actuals_pkey" PRIMARY KEY ("plan_id","item_id")
);

-- CreateTable
CREATE TABLE "markets" (
    "profile_id" UUID NOT NULL,
    "market_name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "category_slug" TEXT NOT NULL,
    "title_ml" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "qty_available" DOUBLE PRECISION NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "area" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'active',
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_views" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "title_ml" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_ml" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "scheme_tag" TEXT NOT NULL,
    "area_filter" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_reads" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notice_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "scheme" TEXT NOT NULL DEFAULT 'pm_svanidhi',
    "status" "RegStatus" NOT NULL DEFAULT 'draft',
    "self_declared" JSONB NOT NULL DEFAULT '{}',
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "items_vendor_id_idx" ON "items"("vendor_id");

-- CreateIndex
CREATE INDEX "day_logs_vendor_id_date_idx" ON "day_logs"("vendor_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "day_logs_vendor_id_date_key" ON "day_logs"("vendor_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sale_events_client_id_key" ON "sale_events"("client_id");

-- CreateIndex
CREATE INDEX "sale_events_day_log_id_idx" ON "sale_events"("day_log_id");

-- CreateIndex
CREATE INDEX "sale_events_item_id_idx" ON "sale_events"("item_id");

-- CreateIndex
CREATE INDEX "day_item_summaries_item_id_idx" ON "day_item_summaries"("item_id");

-- CreateIndex
CREATE INDEX "plans_vendor_id_for_date_idx" ON "plans"("vendor_id", "for_date");

-- CreateIndex
CREATE UNIQUE INDEX "plans_vendor_id_for_date_key" ON "plans"("vendor_id", "for_date");

-- CreateIndex
CREATE INDEX "plan_actuals_item_id_idx" ON "plan_actuals"("item_id");

-- CreateIndex
CREATE INDEX "offers_market_id_idx" ON "offers"("market_id");

-- CreateIndex
CREATE INDEX "offers_category_slug_area_idx" ON "offers"("category_slug", "area");

-- CreateIndex
CREATE INDEX "offer_views_vendor_id_idx" ON "offer_views"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_views_offer_id_vendor_id_key" ON "offer_views"("offer_id", "vendor_id");

-- CreateIndex
CREATE INDEX "notices_officer_id_idx" ON "notices"("officer_id");

-- CreateIndex
CREATE INDEX "notice_reads_vendor_id_idx" ON "notice_reads"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_reads_notice_id_vendor_id_key" ON "notice_reads"("notice_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_vendor_id_idx" ON "share_links"("vendor_id");

-- CreateIndex
CREATE INDEX "registrations_vendor_id_idx" ON "registrations"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_vendor_id_scheme_key" ON "registrations"("vendor_id", "scheme");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_logs" ADD CONSTRAINT "day_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_events" ADD CONSTRAINT "sale_events_day_log_id_fkey" FOREIGN KEY ("day_log_id") REFERENCES "day_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_events" ADD CONSTRAINT "sale_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_item_summaries" ADD CONSTRAINT "day_item_summaries_day_log_id_fkey" FOREIGN KEY ("day_log_id") REFERENCES "day_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_item_summaries" ADD CONSTRAINT "day_item_summaries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_actuals" ADD CONSTRAINT "plan_actuals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_actuals" ADD CONSTRAINT "plan_actuals_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS deny-all (defence in depth). The app talks to Postgres via Prisma as the owner role, which bypasses RLS.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "day_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "day_item_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_actuals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "markets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offer_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notice_reads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

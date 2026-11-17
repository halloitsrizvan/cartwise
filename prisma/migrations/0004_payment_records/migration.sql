-- Group sales into bills with a payment method and the price at the time of sale
ALTER TABLE "sale_events" ADD COLUMN "bill_id" TEXT;
ALTER TABLE "sale_events" ADD COLUMN "pay_method" TEXT;
ALTER TABLE "sale_events" ADD COLUMN "unit_price" DOUBLE PRECISION;
CREATE INDEX "sale_events_bill_id_idx" ON "sale_events"("bill_id");

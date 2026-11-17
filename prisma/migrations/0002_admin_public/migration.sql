-- Roles are now vendor | admin. Market accounts, offers and their tables are removed.
DELETE FROM "profiles" WHERE "role"::text = 'market';
DROP TABLE IF EXISTS "offer_views";
DROP TABLE IF EXISTS "offers";
DROP TABLE IF EXISTS "markets";
DROP TYPE IF EXISTS "OfferStatus";

ALTER TYPE "user_role" RENAME TO "user_role_old";
CREATE TYPE "user_role" AS ENUM ('vendor', 'admin');
ALTER TABLE "profiles" ALTER COLUMN "role" TYPE "user_role"
  USING (CASE "role"::text WHEN 'officer' THEN 'admin' ELSE "role"::text END)::"user_role";
DROP TYPE "user_role_old";

-- Opt-in public vendor listing
ALTER TABLE "vendors" ADD COLUMN "public_listed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "vendors" ADD COLUMN "public_phone" TEXT;
ALTER TABLE "vendors" ADD COLUMN "public_place" TEXT;
CREATE INDEX "vendors_public_listed_idx" ON "vendors"("public_listed");

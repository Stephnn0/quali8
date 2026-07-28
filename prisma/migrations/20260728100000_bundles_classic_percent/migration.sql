-- Bundles v2: classic percentage bundles shown on every contained product's
-- page. Drops the main-product columns and replaces the fixed discountAmount
-- with discountPercent. Existing rows (pre-release dev data) get 10%.

-- CreateEnum
CREATE TYPE "BundleType" AS ENUM ('CLASSIC');

-- DropIndex
DROP INDEX "Bundle_shop_productId_status_idx";

-- AlterTable
ALTER TABLE "Bundle" DROP COLUMN "discountAmount",
DROP COLUMN "productHandle",
DROP COLUMN "productId",
DROP COLUMN "productImage",
DROP COLUMN "productTitle",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "type" "BundleType" NOT NULL DEFAULT 'CLASSIC';

-- Backfill default only existed to satisfy pre-existing rows; new rows must
-- always provide an explicit percent.
ALTER TABLE "Bundle" ALTER COLUMN "discountPercent" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Bundle_shop_status_idx" ON "Bundle"("shop", "status");

-- CreateIndex
CREATE INDEX "BundleItem_productId_idx" ON "BundleItem"("productId");

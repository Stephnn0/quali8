-- Stores the GID of the shop's single automatic app discount that backs all
-- active bundles (created via discountAutomaticAppCreate against the
-- bundle-discounts function). Null until the first bundle is activated.

-- AlterTable
ALTER TABLE "ShopifyStore" ADD COLUMN "bundleDiscountId" TEXT;

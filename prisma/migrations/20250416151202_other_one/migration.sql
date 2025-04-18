/*
  Warnings:

  - Added the required column `shop` to the `Conditions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conditions" ADD COLUMN     "shop" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Conditions" ADD CONSTRAINT "Conditions_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

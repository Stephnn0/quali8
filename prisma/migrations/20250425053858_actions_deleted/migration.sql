/*
  Warnings:

  - You are about to drop the column `marketingActionId` on the `ShippingDiscountAction` table. All the data in the column will be lost.
  - You are about to drop the `Actions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MarketingActions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shop` to the `ShippingDiscountAction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Actions" DROP CONSTRAINT "Actions_shop_fkey";

-- DropForeignKey
ALTER TABLE "ShippingDiscountAction" DROP CONSTRAINT "ShippingDiscountAction_marketingActionId_fkey";

-- DropForeignKey
ALTER TABLE "_MarketingActions" DROP CONSTRAINT "_MarketingActions_A_fkey";

-- DropForeignKey
ALTER TABLE "_MarketingActions" DROP CONSTRAINT "_MarketingActions_B_fkey";

-- DropIndex
DROP INDEX "ShippingDiscountAction_marketingActionId_key";

-- AlterTable
ALTER TABLE "ShippingDiscountAction" DROP COLUMN "marketingActionId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "shop" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Actions";

-- DropTable
DROP TABLE "_MarketingActions";

-- CreateTable
CREATE TABLE "_ShippingDiscounts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ShippingDiscounts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ShippingDiscounts_B_index" ON "_ShippingDiscounts"("B");

-- AddForeignKey
ALTER TABLE "ShippingDiscountAction" ADD CONSTRAINT "ShippingDiscountAction_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShippingDiscounts" ADD CONSTRAINT "_ShippingDiscounts_A_fkey" FOREIGN KEY ("A") REFERENCES "Qualifiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShippingDiscounts" ADD CONSTRAINT "_ShippingDiscounts_B_fkey" FOREIGN KEY ("B") REFERENCES "ShippingDiscountAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

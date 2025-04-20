/*
  Warnings:

  - A unique constraint covering the columns `[shopifyDiscountId]` on the table `ShippingDiscountAction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shopifyDiscountId` to the `ShippingDiscountAction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShippingDiscountAction" ADD COLUMN     "shopifyDiscountId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ShippingDiscountAction_shopifyDiscountId_key" ON "ShippingDiscountAction"("shopifyDiscountId");

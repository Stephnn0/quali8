/*
  Warnings:

  - You are about to drop the column `shippingRatesIds` on the `ShippingDiscountAction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShippingDiscountAction" DROP COLUMN "shippingRatesIds",
ADD COLUMN     "shippingRatesNames" TEXT[];

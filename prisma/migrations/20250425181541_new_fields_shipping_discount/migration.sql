/*
  Warnings:

  - Added the required column `shippingDiscountState` to the `ShippingDiscountAction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShippingDiscountState" AS ENUM ('ENABLED', 'DISABLED');

-- AlterTable
ALTER TABLE "ShippingDiscountAction" ADD COLUMN     "combinedWithOrderDiscounts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "combinedWithProductDiscounts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limitUsagePerOneCustomer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shippingDiscountState" "ShippingDiscountState" NOT NULL;

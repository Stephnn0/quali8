/*
  Warnings:

  - You are about to drop the column `hasAddons` on the `RecurringPlan` table. All the data in the column will be lost.
  - You are about to drop the column `hasCarrierService` on the `RecurringPlan` table. All the data in the column will be lost.
  - You are about to drop the column `hasCheckoutBlocks` on the `RecurringPlan` table. All the data in the column will be lost.
  - You are about to drop the column `hasDeliveryLocations` on the `RecurringPlan` table. All the data in the column will be lost.
  - You are about to drop the column `hasMasIntegration` on the `RecurringPlan` table. All the data in the column will be lost.
  - You are about to drop the column `hasOccassions` on the `RecurringPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RecurringPlan" DROP COLUMN "hasAddons",
DROP COLUMN "hasCarrierService",
DROP COLUMN "hasCheckoutBlocks",
DROP COLUMN "hasDeliveryLocations",
DROP COLUMN "hasMasIntegration",
DROP COLUMN "hasOccassions",
ADD COLUMN     "hasQualifiers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasShippingDiscounts" BOOLEAN NOT NULL DEFAULT false;

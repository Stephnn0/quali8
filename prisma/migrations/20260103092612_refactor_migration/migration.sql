/*
  Warnings:

  - You are about to drop the `_ShippingDiscounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('SHIPPING_DISCOUNT', 'FREE_GIFT', 'BUNDLE', 'ORDER_DISCOUNT');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "_ShippingDiscounts" DROP CONSTRAINT "_ShippingDiscounts_A_fkey";

-- DropForeignKey
ALTER TABLE "_ShippingDiscounts" DROP CONSTRAINT "_ShippingDiscounts_B_fkey";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "holidayId" INTEGER;

-- DropTable
DROP TABLE "_ShippingDiscounts";

-- CreateTable
CREATE TABLE "Holiday" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PromotionType" NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'INACTIVE',
    "campaignId" INTEGER NOT NULL,
    "shippingDiscountId" INTEGER,
    "config" JSONB,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampaignToQualifiers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CampaignToQualifiers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CampaignToQualifiers_B_index" ON "_CampaignToQualifiers"("B");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_shippingDiscountId_fkey" FOREIGN KEY ("shippingDiscountId") REFERENCES "ShippingDiscountAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToQualifiers" ADD CONSTRAINT "_CampaignToQualifiers_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToQualifiers" ADD CONSTRAINT "_CampaignToQualifiers_B_fkey" FOREIGN KEY ("B") REFERENCES "Qualifiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

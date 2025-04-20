-- CreateEnum
CREATE TYPE "MarketingActionType" AS ENUM ('SHIPPING_DISCOUNTS');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "ShippingRateType" AS ENUM ('ALL_RATES', 'SELECTED_RATES');

-- CreateTable
CREATE TABLE "Actions" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MarketingActionType" NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingDiscountAction" (
    "id" SERIAL NOT NULL,
    "marketingActionId" INTEGER NOT NULL,
    "automaticOrCode" TEXT NOT NULL,
    "codeOrName" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" TEXT NOT NULL,
    "shippingRateType" "ShippingRateType" NOT NULL,
    "shippingRatesIds" TEXT[],
    "startDate" TIMESTAMP(3),
    "startTime" TEXT,
    "hasEndDate" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP(3),
    "endTime" TEXT,

    CONSTRAINT "ShippingDiscountAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MarketingActions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MarketingActions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingDiscountAction_marketingActionId_key" ON "ShippingDiscountAction"("marketingActionId");

-- CreateIndex
CREATE INDEX "_MarketingActions_B_index" ON "_MarketingActions"("B");

-- AddForeignKey
ALTER TABLE "Actions" ADD CONSTRAINT "Actions_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingDiscountAction" ADD CONSTRAINT "ShippingDiscountAction_marketingActionId_fkey" FOREIGN KEY ("marketingActionId") REFERENCES "Actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MarketingActions" ADD CONSTRAINT "_MarketingActions_A_fkey" FOREIGN KEY ("A") REFERENCES "Actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MarketingActions" ADD CONSTRAINT "_MarketingActions_B_fkey" FOREIGN KEY ("B") REFERENCES "Qualifiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

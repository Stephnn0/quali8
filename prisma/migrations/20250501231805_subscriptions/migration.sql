-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'DECLINED', 'EXPIRED', 'FROZEN', 'PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "CancellationMethod" AS ENUM ('UNINSTALL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShopifyDiscountType" AS ENUM ('AMOUNT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "ShopifyPricingInterval" AS ENUM ('ANNUAL', 'EVERY_30_DAYS');

-- CreateEnum
CREATE TYPE "RecurringPlanLevel" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "Unstable_UsagePlanLevel" AS ENUM ('PAY_AS_YOU_GO');

-- CreateTable
CREATE TABLE "ShopifySubscription" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER,
    "cancelMethod" "CancellationMethod",
    "shopifyRecurringPricingId" INTEGER,
    "unstable_shopifyUsagePricingId" INTEGER,
    "recurringPlanId" INTEGER,
    "unstable_usagePlanId" INTEGER,
    "shop" TEXT NOT NULL,

    CONSTRAINT "ShopifySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyRecurringPricing" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "interval" "ShopifyPricingInterval" NOT NULL,
    "discount" DOUBLE PRECISION,
    "discountType" "ShopifyDiscountType",
    "discountPriceAfter" DOUBLE PRECISION,
    "discountCurrencyCode" TEXT,
    "discountDurationIntervals" INTEGER,
    "discountRemainingIntervals" INTEGER,

    CONSTRAINT "ShopifyRecurringPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unstable_ShopifyUsagePricing" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cappedAmount" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "interval" "ShopifyPricingInterval" NOT NULL,
    "terms" TEXT NOT NULL,
    "balanceUsed" DOUBLE PRECISION NOT NULL,
    "balanceCurrencyCode" TEXT NOT NULL,

    CONSTRAINT "Unstable_ShopifyUsagePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringPlan" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopifyPlanID" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" "RecurringPlanLevel" NOT NULL DEFAULT 'FREE',
    "interval" "ShopifyPricingInterval" NOT NULL,
    "trialDays" INTEGER,
    "hasOccassions" BOOLEAN NOT NULL DEFAULT false,
    "hasAddons" BOOLEAN NOT NULL DEFAULT false,
    "hasCheckoutBlocks" BOOLEAN NOT NULL DEFAULT false,
    "hasDeliveryLocations" BOOLEAN NOT NULL DEFAULT false,
    "hasCarrierService" BOOLEAN NOT NULL DEFAULT false,
    "hasMasIntegration" BOOLEAN NOT NULL DEFAULT false,
    "read_generalApis" BOOLEAN NOT NULL,
    "write_generalApis" BOOLEAN NOT NULL,

    CONSTRAINT "RecurringPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unstable_UsagePlan" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cappedAmount" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" "Unstable_UsagePlanLevel" NOT NULL DEFAULT 'PAY_AS_YOU_GO',
    "trialDays" INTEGER,

    CONSTRAINT "Unstable_UsagePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifySubscription_shop_shopifyId_key" ON "ShopifySubscription"("shop", "shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyRecurringPricing_price_currencyCode_interval_discoun_key" ON "ShopifyRecurringPricing"("price", "currencyCode", "interval", "discount", "discountType", "discountPriceAfter", "discountCurrencyCode", "discountDurationIntervals", "discountRemainingIntervals");

-- CreateIndex
CREATE UNIQUE INDEX "Unstable_ShopifyUsagePricing_cappedAmount_currencyCode_inte_key" ON "Unstable_ShopifyUsagePricing"("cappedAmount", "currencyCode", "interval", "terms", "balanceUsed", "balanceCurrencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlan_code_key" ON "RecurringPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlan_name_interval_key" ON "RecurringPlan"("name", "interval");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlan_name_interval_level_key" ON "RecurringPlan"("name", "interval", "level");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlan_shopifyPlanID_interval_key" ON "RecurringPlan"("shopifyPlanID", "interval");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlan_shopifyPlanID_interval_level_key" ON "RecurringPlan"("shopifyPlanID", "interval", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Unstable_UsagePlan_code_key" ON "Unstable_UsagePlan"("code");

-- AddForeignKey
ALTER TABLE "ShopifySubscription" ADD CONSTRAINT "ShopifySubscription_shopifyRecurringPricingId_fkey" FOREIGN KEY ("shopifyRecurringPricingId") REFERENCES "ShopifyRecurringPricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySubscription" ADD CONSTRAINT "ShopifySubscription_unstable_shopifyUsagePricingId_fkey" FOREIGN KEY ("unstable_shopifyUsagePricingId") REFERENCES "Unstable_ShopifyUsagePricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySubscription" ADD CONSTRAINT "ShopifySubscription_recurringPlanId_fkey" FOREIGN KEY ("recurringPlanId") REFERENCES "RecurringPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySubscription" ADD CONSTRAINT "ShopifySubscription_unstable_usagePlanId_fkey" FOREIGN KEY ("unstable_usagePlanId") REFERENCES "Unstable_UsagePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySubscription" ADD CONSTRAINT "ShopifySubscription_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

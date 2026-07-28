-- CreateEnum
CREATE TYPE "BriefSource" AS ENUM ('AI', 'FALLBACK');

-- AlterEnum
ALTER TYPE "RecurringPlanLevel" ADD VALUE 'ADVANCE';

-- AlterTable
ALTER TABLE "RecurringPlan" ADD COLUMN     "hasAssistant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StoreProfile" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "niche" TEXT NOT NULL,
    "nicheLabel" TEXT NOT NULL,
    "country" TEXT,
    "note" TEXT,
    "checklistDone" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shop" TEXT NOT NULL,

    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardBrief" (
    "id" SERIAL NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "niche" TEXT NOT NULL,
    "country" TEXT,
    "source" "BriefSource" NOT NULL DEFAULT 'AI',
    "payload" JSONB NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "DashboardBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreProfile_shop_key" ON "StoreProfile"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardBrief_shop_key" ON "DashboardBrief"("shop");

-- AddForeignKey
ALTER TABLE "StoreProfile" ADD CONSTRAINT "StoreProfile_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardBrief" ADD CONSTRAINT "DashboardBrief_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;


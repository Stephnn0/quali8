-- CreateEnum
CREATE TYPE "OccasionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "RecurringPlan" ADD COLUMN     "hasRecommendations" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Occasion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OccasionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Occasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccasionProduct" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "occasionId" INTEGER NOT NULL,

    CONSTRAINT "OccasionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Occasion_shop_status_idx" ON "Occasion"("shop", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Occasion_shop_slug_key" ON "Occasion"("shop", "slug");

-- CreateIndex
CREATE INDEX "OccasionProduct_occasionId_idx" ON "OccasionProduct"("occasionId");

-- AddForeignKey
ALTER TABLE "Occasion" ADD CONSTRAINT "Occasion_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccasionProduct" ADD CONSTRAINT "OccasionProduct_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "Occasion"("id") ON DELETE CASCADE ON UPDATE CASCADE;


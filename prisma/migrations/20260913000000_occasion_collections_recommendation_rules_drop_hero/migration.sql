-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RecommendationTrigger" AS ENUM ('ALWAYS', 'CART_HAS_COLLECTION', 'CART_HAS_PRODUCT', 'CART_TOTAL_MIN');

-- CreateEnum
CREATE TYPE "RecommendationSource" AS ENUM ('COLLECTION', 'TAG', 'NEWEST', 'PRODUCTS');

-- DropForeignKey
ALTER TABLE "ScheduledHero" DROP CONSTRAINT "ScheduledHero_specialDateId_fkey";

-- DropTable
DROP TABLE "ScheduledHero";

-- CreateTable
CREATE TABLE "OccasionCollection" (
    "id" SERIAL NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "occasionId" INTEGER NOT NULL,

    CONSTRAINT "OccasionCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRule" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "heading" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "trigger" "RecommendationTrigger" NOT NULL DEFAULT 'ALWAYS',
    "triggerCollectionId" TEXT,
    "triggerCollectionTitle" TEXT,
    "triggerProductId" TEXT,
    "triggerProductTitle" TEXT,
    "triggerMinTotal" DOUBLE PRECISION,
    "source" "RecommendationSource" NOT NULL DEFAULT 'COLLECTION',
    "sourceCollectionId" TEXT,
    "sourceCollectionTitle" TEXT,
    "sourceTag" TEXT,
    "sourceProducts" JSONB,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "limit" INTEGER NOT NULL DEFAULT 4,
    "excludeCartItems" BOOLEAN NOT NULL DEFAULT true,
    "shop" TEXT NOT NULL,

    CONSTRAINT "RecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OccasionCollection_occasionId_idx" ON "OccasionCollection"("occasionId");

-- CreateIndex
CREATE INDEX "RecommendationRule_shop_status_position_idx" ON "RecommendationRule"("shop", "status", "position");

-- AddForeignKey
ALTER TABLE "OccasionCollection" ADD CONSTRAINT "OccasionCollection_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "Occasion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRule" ADD CONSTRAINT "RecommendationRule_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;


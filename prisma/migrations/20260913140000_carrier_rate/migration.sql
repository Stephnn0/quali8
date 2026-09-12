-- AlterTable
ALTER TABLE "ShopifyStore" ADD COLUMN     "carrierServiceId" TEXT;

-- CreateTable
CREATE TABLE "CarrierRate" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL DEFAULT 'Local delivery',
    "fallbackPrice" DOUBLE PRECISION,
    "shop" TEXT NOT NULL,

    CONSTRAINT "CarrierRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarrierRate_shop_key" ON "CarrierRate"("shop");

-- AddForeignKey
ALTER TABLE "CarrierRate" ADD CONSTRAINT "CarrierRate_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;


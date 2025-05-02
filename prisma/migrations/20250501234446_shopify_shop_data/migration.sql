-- CreateTable
CREATE TABLE "ShopifyShopData" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopID" BIGINT,
    "name" TEXT,
    "email" TEXT,
    "shopOwnerName" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "timezone" TEXT,
    "primaryLocale" TEXT,
    "ianaTimezone" TEXT,
    "planName" TEXT,
    "planDisplayName" TEXT,
    "myshopifyDomain" TEXT,
    "hasStorefront" BOOLEAN,
    "shop" TEXT NOT NULL,

    CONSTRAINT "ShopifyShopData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyShopData_shop_key" ON "ShopifyShopData"("shop");

-- AddForeignKey
ALTER TABLE "ShopifyShopData" ADD CONSTRAINT "ShopifyShopData_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

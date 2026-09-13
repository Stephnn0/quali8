-- CreateTable
CREATE TABLE "DeliverySchedule" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requireDate" BOOLEAN NOT NULL DEFAULT true,
    "deliveryBlockedWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "deliveryBlockedDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliveryLeadDays" INTEGER NOT NULL DEFAULT 0,
    "deliveryMaxDaysAhead" INTEGER NOT NULL DEFAULT 60,
    "pickupBlockedWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "pickupBlockedDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pickupLeadDays" INTEGER NOT NULL DEFAULT 0,
    "pickupMaxDaysAhead" INTEGER NOT NULL DEFAULT 60,
    "shop" TEXT NOT NULL,

    CONSTRAINT "DeliverySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySchedule_shop_key" ON "DeliverySchedule"("shop");

-- AddForeignKey
ALTER TABLE "DeliverySchedule" ADD CONSTRAINT "DeliverySchedule_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

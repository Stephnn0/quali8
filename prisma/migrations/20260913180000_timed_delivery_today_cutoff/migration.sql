-- AlterTable: same-day rules on the calendar
ALTER TABLE "DeliverySchedule" ADD COLUMN "deliveryTodayEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deliveryTodayCutoff" TEXT,
ADD COLUMN "pickupTodayEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pickupTodayCutoff" TEXT;

-- CreateTable: timed delivery windows
CREATE TABLE "DeliveryTimeWindow" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "shop" TEXT NOT NULL,

    CONSTRAINT "DeliveryTimeWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryTimeWindow_shop_active_position_idx" ON "DeliveryTimeWindow"("shop", "active", "position");

-- AddForeignKey
ALTER TABLE "DeliveryTimeWindow" ADD CONSTRAINT "DeliveryTimeWindow_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

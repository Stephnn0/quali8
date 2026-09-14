-- CreateEnum
CREATE TYPE "PopupSubscriberResult" AS ENUM ('CREATED', 'UPDATED', 'FAILED');

-- CreateTable
CREATE TABLE "PopupSubscriber" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "customerId" TEXT,
    "result" "PopupSubscriberResult" NOT NULL,
    "lastError" TEXT,
    "tags" TEXT NOT NULL,
    "discountCode" TEXT NOT NULL,
    "subscribeCount" INTEGER NOT NULL DEFAULT 1,
    "lastSubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopupSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupDailyStat" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "dismissals" INTEGER NOT NULL DEFAULT 0,
    "subscribes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PopupDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PopupSubscriber_shop_createdAt_idx" ON "PopupSubscriber"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PopupSubscriber_shop_email_key" ON "PopupSubscriber"("shop", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PopupDailyStat_shop_day_key" ON "PopupDailyStat"("shop", "day");

-- CreateEnum
CREATE TYPE "MenuLinkType" AS ENUM ('COLLECTION', 'URL');

-- CreateTable
CREATE TABLE "JobRun" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledMenuItem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "menuId" TEXT NOT NULL,
    "menuTitle" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "linkType" "MenuLinkType" NOT NULL DEFAULT 'COLLECTION',
    "resourceId" TEXT,
    "resourceTitle" TEXT,
    "url" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "appliedMenuItemId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "specialDateId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "ScheduledMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRun_name_key" ON "JobRun"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledMenuItem_specialDateId_key" ON "ScheduledMenuItem"("specialDateId");

-- CreateIndex
CREATE INDEX "ScheduledMenuItem_shop_startDate_endDate_idx" ON "ScheduledMenuItem"("shop", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "ScheduledMenuItem" ADD CONSTRAINT "ScheduledMenuItem_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;


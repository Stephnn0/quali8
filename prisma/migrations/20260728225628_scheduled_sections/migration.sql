-- CreateTable
CREATE TABLE "ScheduledHero" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT,
    "buttonLabel" TEXT,
    "buttonUrl" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "specialDateId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "ScheduledHero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscribePopup" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountCode" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "specialDateId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "SubscribePopup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledHero_specialDateId_key" ON "ScheduledHero"("specialDateId");

-- CreateIndex
CREATE INDEX "ScheduledHero_shop_startDate_endDate_idx" ON "ScheduledHero"("shop", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "SubscribePopup_specialDateId_key" ON "SubscribePopup"("specialDateId");

-- CreateIndex
CREATE INDEX "SubscribePopup_shop_startDate_endDate_idx" ON "SubscribePopup"("shop", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "ScheduledHero" ADD CONSTRAINT "ScheduledHero_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscribePopup" ADD CONSTRAINT "SubscribePopup_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;


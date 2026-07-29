-- CreateTable
CREATE TABLE "AnnouncementBar" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL DEFAULT '#2c1f58',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "specialDateId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "AnnouncementBar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementBar_specialDateId_key" ON "AnnouncementBar"("specialDateId");

-- CreateIndex
CREATE INDEX "AnnouncementBar_shop_startDate_endDate_idx" ON "AnnouncementBar"("shop", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "AnnouncementBar" ADD CONSTRAINT "AnnouncementBar_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;


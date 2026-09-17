-- AlterTable
ALTER TABLE "RecurringPlan" ADD COLUMN     "bundleLimit" INTEGER,
ADD COLUMN     "hasAnnouncements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasDeliveryZones" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSubscribePopup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "popupSignupLimit" INTEGER;

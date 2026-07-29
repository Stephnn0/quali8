-- AlterTable
ALTER TABLE "ScheduledHero" ADD COLUMN     "buttonBackground" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "buttonTextColor" TEXT NOT NULL DEFAULT '#1a1a1a',
ADD COLUMN     "heightPx" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "imageUrl2" TEXT,
ADD COLUMN     "imageUrl3" TEXT,
ADD COLUMN     "overlayOpacity" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "textColor" TEXT NOT NULL DEFAULT '#ffffff';


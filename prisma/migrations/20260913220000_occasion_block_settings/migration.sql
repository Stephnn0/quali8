-- CreateTable
CREATE TABLE "OccasionBlockSettings" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heading" TEXT NOT NULL DEFAULT 'Shopping for an occasion?',
    "subheading" TEXT NOT NULL DEFAULT 'Pick one and we''ll suggest the perfect add-on.',
    "suggestedCount" INTEGER NOT NULL DEFAULT 3,
    "otherLabel" TEXT NOT NULL DEFAULT 'Other occasions',
    "pickerTitle" TEXT NOT NULL DEFAULT 'Which occasion?',
    "giftsHeading" TEXT NOT NULL DEFAULT 'Gifts for {occasion}',
    "giftsSubtext" TEXT NOT NULL DEFAULT 'Add one to go with this item.',
    "changeLabel" TEXT NOT NULL DEFAULT 'Change occasion',
    "pairWithProduct" BOOLEAN NOT NULL DEFAULT true,
    "addLabel" TEXT NOT NULL DEFAULT 'Add both to cart',
    "addingLabel" TEXT NOT NULL DEFAULT 'Adding…',
    "addedLabel" TEXT NOT NULL DEFAULT 'Added ✓',
    "afterAdd" TEXT NOT NULL DEFAULT 'stay',
    "giftLimit" INTEGER NOT NULL DEFAULT 8,
    "showNowBadge" BOOLEAN NOT NULL DEFAULT true,
    "nowLabel" TEXT NOT NULL DEFAULT 'Now',
    "emptyText" TEXT NOT NULL DEFAULT 'No gift picks for this occasion yet.',
    "rememberChoice" BOOLEAN NOT NULL DEFAULT true,
    "shop" TEXT NOT NULL,

    CONSTRAINT "OccasionBlockSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OccasionBlockSettings_shop_key" ON "OccasionBlockSettings"("shop");

-- AddForeignKey
ALTER TABLE "OccasionBlockSettings" ADD CONSTRAINT "OccasionBlockSettings_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

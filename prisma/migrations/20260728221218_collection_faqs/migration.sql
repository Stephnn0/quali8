-- CreateTable
CREATE TABLE "CollectionFaq" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionId" TEXT NOT NULL,
    "collectionTitle" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "shop" TEXT NOT NULL,

    CONSTRAINT "CollectionFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionFaq_shop_collectionId_idx" ON "CollectionFaq"("shop", "collectionId");

-- AddForeignKey
ALTER TABLE "CollectionFaq" ADD CONSTRAINT "CollectionFaq_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;


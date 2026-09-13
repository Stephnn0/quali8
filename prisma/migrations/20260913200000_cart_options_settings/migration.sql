-- CreateTable
CREATE TABLE "CartOptionsSettings" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "occasionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cardMessageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notesLabel" TEXT NOT NULL DEFAULT 'Notes for us',
    "doorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shop" TEXT NOT NULL,

    CONSTRAINT "CartOptionsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartOptionsSettings_shop_key" ON "CartOptionsSettings"("shop");

-- AddForeignKey
ALTER TABLE "CartOptionsSettings" ADD CONSTRAINT "CartOptionsSettings_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

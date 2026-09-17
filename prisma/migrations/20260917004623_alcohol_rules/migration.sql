-- CreateTable
CREATE TABLE "AlcoholRules" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "collections" JSONB NOT NULL DEFAULT '[]',
    "ageCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minimumAge" INTEGER NOT NULL DEFAULT 21,
    "localOnlyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notAloneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ageMessage" TEXT NOT NULL DEFAULT 'You must be {age} or older to purchase alcohol. Please enter your date of birth and confirm.',
    "localOnlyMessage" TEXT NOT NULL DEFAULT 'Alcohol can only be delivered locally. We can''t deliver alcohol to {zip}.',
    "notAloneMessage" TEXT NOT NULL DEFAULT 'Alcohol can''t be purchased on its own. Please add another item to your order.',
    "validationId" TEXT,
    "shop" TEXT NOT NULL,

    CONSTRAINT "AlcoholRules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlcoholRules_shop_key" ON "AlcoholRules"("shop");

-- AddForeignKey
ALTER TABLE "AlcoholRules" ADD CONSTRAINT "AlcoholRules_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

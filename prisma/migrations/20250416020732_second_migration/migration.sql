-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('INSTALLED', 'SETUP', 'UNINSTALLED');

-- CreateEnum
CREATE TYPE "LogicType" AS ENUM ('AND', 'OR');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('EXAMPLE_TYPE_1', 'EXAMPLE_TYPE_2');

-- CreateEnum
CREATE TYPE "ComparisonType" AS ENUM ('GREATER_THAN', 'EQUAL', 'LESS_THAN');

-- CreateTable
CREATE TABLE "ShopifyStore" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop" TEXT NOT NULL,
    "shopifyPlan" TEXT,
    "status" "AppStatus" NOT NULL,
    "appVersion" TEXT NOT NULL DEFAULT '0.0.0',

    CONSTRAINT "ShopifyStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualifiers" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "conditionLogicType" "LogicType" NOT NULL,

    CONSTRAINT "Qualifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conditions" (
    "id" SERIAL NOT NULL,
    "type" "ConditionType",
    "value" TEXT,
    "comparisonType" "ComparisonType",
    "qualifierId" INTEGER NOT NULL,

    CONSTRAINT "Conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CustomerQualifiers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CustomerQualifiers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_shop_key" ON "ShopifyStore"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Customers_email_key" ON "Customers"("email");

-- CreateIndex
CREATE INDEX "_CustomerQualifiers_B_index" ON "_CustomerQualifiers"("B");

-- AddForeignKey
ALTER TABLE "Qualifiers" ADD CONSTRAINT "Qualifiers_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conditions" ADD CONSTRAINT "Conditions_qualifierId_fkey" FOREIGN KEY ("qualifierId") REFERENCES "Qualifiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customers" ADD CONSTRAINT "Customers_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerQualifiers" ADD CONSTRAINT "_CustomerQualifiers_A_fkey" FOREIGN KEY ("A") REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerQualifiers" ADD CONSTRAINT "_CustomerQualifiers_B_fkey" FOREIGN KEY ("B") REFERENCES "Qualifiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

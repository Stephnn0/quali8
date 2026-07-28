-- CreateEnum
CREATE TYPE "SpecialDateSource" AS ENUM ('AI', 'MERCHANT');

-- CreateEnum
CREATE TYPE "TodoKind" AS ENUM ('SEO', 'MARKETING', 'GENERAL');

-- CreateEnum
CREATE TYPE "SeoResourceType" AS ENUM ('PRODUCT', 'COLLECTION');

-- CreateTable
CREATE TABLE "SpecialDate" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "whyItMatters" TEXT,
    "source" "SpecialDateSource" NOT NULL DEFAULT 'MERCHANT',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "todosGeneratedAt" TIMESTAMP(3),
    "shop" TEXT NOT NULL,

    CONSTRAINT "SpecialDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDateTodo" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "TodoKind" NOT NULL DEFAULT 'GENERAL',
    "source" "SpecialDateSource" NOT NULL DEFAULT 'MERCHANT',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "specialDateId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "SpecialDateTodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMetaAction" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourceType" "SeoResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceTitle" TEXT NOT NULL,
    "previousSeoTitle" TEXT,
    "previousSeoDescription" TEXT,
    "newSeoTitle" TEXT NOT NULL,
    "newSeoDescription" TEXT NOT NULL,
    "specialDateId" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "SeoMetaAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "shop" TEXT NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialDate_shop_date_idx" ON "SpecialDate"("shop", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDate_shop_name_date_key" ON "SpecialDate"("shop", "name", "date");

-- CreateIndex
CREATE INDEX "SpecialDateTodo_specialDateId_idx" ON "SpecialDateTodo"("specialDateId");

-- CreateIndex
CREATE INDEX "SpecialDateTodo_shop_idx" ON "SpecialDateTodo"("shop");

-- CreateIndex
CREATE INDEX "SeoMetaAction_specialDateId_idx" ON "SeoMetaAction"("specialDateId");

-- CreateIndex
CREATE INDEX "SeoMetaAction_shop_createdAt_idx" ON "SeoMetaAction"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_shop_createdAt_idx" ON "AiUsage"("shop", "createdAt");

-- AddForeignKey
ALTER TABLE "SpecialDate" ADD CONSTRAINT "SpecialDate_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDateTodo" ADD CONSTRAINT "SpecialDateTodo_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMetaAction" ADD CONSTRAINT "SeoMetaAction_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;


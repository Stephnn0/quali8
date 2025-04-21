/*
  Warnings:

  - A unique constraint covering the columns `[shopifyId]` on the table `Customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shopifyId` to the `Customers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Customers_email_key";

-- AlterTable
ALTER TABLE "Customers" ADD COLUMN     "shopifyId" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customers_shopifyId_key" ON "Customers"("shopifyId");

/*
  Warnings:

  - The values [EXAMPLE_TYPE_1,EXAMPLE_TYPE_2] on the enum `ConditionType` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `type` on table `Conditions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `value` on table `Conditions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `comparisonType` on table `Conditions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConditionType_new" AS ENUM ('CART_TOTAL', 'PRODUCT_ITEM');
ALTER TABLE "Conditions" ALTER COLUMN "type" TYPE "ConditionType_new" USING ("type"::text::"ConditionType_new");
ALTER TYPE "ConditionType" RENAME TO "ConditionType_old";
ALTER TYPE "ConditionType_new" RENAME TO "ConditionType";
DROP TYPE "ConditionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Conditions" ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "value" SET NOT NULL,
ALTER COLUMN "comparisonType" SET NOT NULL;

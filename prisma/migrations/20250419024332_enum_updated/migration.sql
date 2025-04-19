/*
  Warnings:

  - The values [GREATER_THAN,EQUAL,LESS_THAN] on the enum `ComparisonType` will be removed. If these variants are still used in the database, this will fail.
  - The values [CART_TOTAL,PRODUCT_ITEM] on the enum `ConditionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ComparisonType_new" AS ENUM ('equals', 'not_equals');
ALTER TABLE "Conditions" ALTER COLUMN "comparisonType" TYPE "ComparisonType_new" USING ("comparisonType"::text::"ComparisonType_new");
ALTER TYPE "ComparisonType" RENAME TO "ComparisonType_old";
ALTER TYPE "ComparisonType_new" RENAME TO "ComparisonType";
DROP TYPE "ComparisonType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ConditionType_new" AS ENUM ('customer_tag', 'customer_order_count', 'customer_email', 'customer_country', 'customer_amount_spent');
ALTER TABLE "Conditions" ALTER COLUMN "type" TYPE "ConditionType_new" USING ("type"::text::"ConditionType_new");
ALTER TYPE "ConditionType" RENAME TO "ConditionType_old";
ALTER TYPE "ConditionType_new" RENAME TO "ConditionType";
DROP TYPE "ConditionType_old";
COMMIT;

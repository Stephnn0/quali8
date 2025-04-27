-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConditionType" ADD VALUE 'updated_at';
ALTER TYPE "ConditionType" ADD VALUE 'tag_not';
ALTER TYPE "ConditionType" ADD VALUE 'order_date';
ALTER TYPE "ConditionType" ADD VALUE 'last_name';
ALTER TYPE "ConditionType" ADD VALUE 'last_abandoned_order_date';
ALTER TYPE "ConditionType" ADD VALUE 'first_name';
ALTER TYPE "ConditionType" ADD VALUE 'customer_date';
ALTER TYPE "ConditionType" ADD VALUE 'accepts_marketing';

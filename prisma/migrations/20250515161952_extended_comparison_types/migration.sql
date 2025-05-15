-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ComparisonType" ADD VALUE 'greater_than';
ALTER TYPE "ComparisonType" ADD VALUE 'less_than';
ALTER TYPE "ComparisonType" ADD VALUE 'greater_than_equals';
ALTER TYPE "ComparisonType" ADD VALUE 'less_than_equals';

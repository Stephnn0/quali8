/*
  Warnings:

  - The values [PRO] on the enum `RecurringPlanLevel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RecurringPlanLevel_new" AS ENUM ('FREE', 'BASIC');
ALTER TABLE "RecurringPlan" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "RecurringPlan" ALTER COLUMN "level" TYPE "RecurringPlanLevel_new" USING ("level"::text::"RecurringPlanLevel_new");
ALTER TYPE "RecurringPlanLevel" RENAME TO "RecurringPlanLevel_old";
ALTER TYPE "RecurringPlanLevel_new" RENAME TO "RecurringPlanLevel";
DROP TYPE "RecurringPlanLevel_old";
ALTER TABLE "RecurringPlan" ALTER COLUMN "level" SET DEFAULT 'FREE';
COMMIT;

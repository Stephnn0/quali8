-- Feature flag for the bundles feature (Pro plan). Plan rows are seeded data:
-- run `npx prisma db seed` after deploying to set it on the paid plan.

-- AlterTable
ALTER TABLE "RecurringPlan" ADD COLUMN "hasBundles" BOOLEAN NOT NULL DEFAULT false;

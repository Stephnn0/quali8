-- When audience membership was last synced from Shopify (initial save or
-- manual refresh). Null for audiences created before this column existed.

-- AlterTable
ALTER TABLE "Qualifiers" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

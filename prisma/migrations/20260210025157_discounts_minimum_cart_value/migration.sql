-- AlterTable
ALTER TABLE "ShippingDiscountAction" ADD COLUMN     "appliesToAllCustomers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMinimumCartValueEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumCartValue" DOUBLE PRECISION DEFAULT 0;

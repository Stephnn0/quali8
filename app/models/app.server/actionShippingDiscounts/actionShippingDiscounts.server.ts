import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export type ShippingDiscountAction = Awaited<
  ReturnType<typeof createActionShippingDiscount>
>;

export async function createActionShippingDiscount(
  prismaArgs: Prisma.ShippingDiscountActionCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shippingDiscountAction =
      await db.shippingDiscountAction.create(prismaArgs);
    return shippingDiscountAction;
  } catch (error) {
    console.error("Error creating shippingDiscountAction:", error);
  }
}

export async function deleteActionShippingDiscount(
  prismaArgs: Prisma.ShippingDiscountActionDeleteArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shippingDiscountAction =
      await db.shippingDiscountAction.delete(prismaArgs);
    return shippingDiscountAction;
  } catch (error) {
    console.error("Error deleting shippingDiscountAction:", error);
  }
}

export async function getActionShippingDiscount(
  prismaArgs: Prisma.ShippingDiscountActionFindUniqueArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shippingDiscountAction =
      await db.shippingDiscountAction.findUnique(prismaArgs);
    return shippingDiscountAction;
  } catch (error) {
    console.error("Error getting shippingDiscountAction:", error);
  }
}

export async function updateActionShippingDiscount(
  prismaArgs: Prisma.ShippingDiscountActionUpdateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shippingDiscountAction =
      await db.shippingDiscountAction.update(prismaArgs);
    return shippingDiscountAction;
  } catch (error) {
    console.error("Error updating shippingDiscountAction:", error);
  }
}

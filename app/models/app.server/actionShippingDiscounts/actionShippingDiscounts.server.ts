import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export type ShippingDiscountAction = Awaited<
  ReturnType<typeof createActionShippingDiscount>
>;

export async function getManyShippingDiscountActionsNotCount(
  prismaArgs: Prisma.ShippingDiscountActionFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shippingDiscountActions =
      await db.shippingDiscountAction.findMany(prismaArgs);
    return shippingDiscountActions;
  } catch (error) {
    console.error("Error getting shippingDiscountActions:", error);
    throw error;
  }
}

export async function getManyShippingDiscountActions(
  prismaArgs: Prisma.ShippingDiscountActionFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const [shippingDiscountActions, shippingDiscountActionsCount] =
      await db.$transaction([
        db.shippingDiscountAction.findMany({
          ...prismaArgs,
        }),
        db.shippingDiscountAction.count({ where: prismaArgs.where || {} }),
      ]);

    return { shippingDiscountActions, shippingDiscountActionsCount };
  } catch (error) {
    console.error("Error getting shippingDiscountActions:", error);
    throw error;
  }
}

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
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
  }
}

import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

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

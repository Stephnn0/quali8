import type {
  Prisma,
  PrismaClient,
  ShippingDiscountAction,
} from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export type Action = Awaited<ReturnType<typeof createAction>>;

export type ActionWithShippingDiscount = Action & {
  shippingDiscount: ShippingDiscountAction;
};

export async function createAction(
  prismaArgs: Prisma.ActionsCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const action = await db.actions.create(prismaArgs);
    return action;
  } catch (error) {
    console.error("Error creating action:", error);
  }
}

export async function getActionsByShop(
  prismaArgs: Prisma.ActionsFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const actions = await db.actions.findMany(prismaArgs);

    return actions;
  } catch (error) {
    console.error("Error getting actions:", error);
  }
}

export async function deleteAction(
  prismaArgs: Prisma.ActionsDeleteArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const action = await db.actions.delete(prismaArgs);
    return action;
  } catch (error) {
    console.error("Error deleting action:", error);
  }
}

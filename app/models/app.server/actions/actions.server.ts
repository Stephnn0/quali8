import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

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

import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/library";

export async function createCondition(
  prismaArgs: Prisma.ConditionsCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const condition = await db.conditions.create(prismaArgs);
    return condition;
  } catch (error) {
    console.error("Error creating condition:", error);
  }
}

export async function getConditionByQualiferId(
  prismaArgs: Prisma.ConditionsFindUniqueArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const condition = await db.conditions.findUnique(prismaArgs);
    return condition;
  } catch (error) {
    console.error("Error fetching condition by qualifier ID:", error);
    return null;
  }
}

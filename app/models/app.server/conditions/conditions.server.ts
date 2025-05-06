import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/library";

export type Condition = Awaited<ReturnType<typeof getConditionByQualiferId>>;

export async function getManyConditions(
  prismaArgs: Prisma.ConditionsFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const conditions = await db.conditions.findMany(prismaArgs);
    return conditions;
  } catch (error) {
    console.error("Error fetching conditions:", error);
  }
}

export async function createCondition(
  prismaArgs: Prisma.ConditionsCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const condition = await db.conditions.create(prismaArgs);
    return condition;
  } catch (error) {
    console.error("Error creating condition:", error);
    throw error;
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
    throw error;
  }
}

export async function deleteCondition(
  prismaArgs: Prisma.ConditionsDeleteArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const condition = await db.conditions.delete(prismaArgs);
    return condition;
  } catch (error) {
    console.error("Error deleting condition:", error);
    throw error;
  }
}

export async function deleteManyConditions(
  prismaArgs: Prisma.ConditionsDeleteManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const conditions = await db.conditions.deleteMany(prismaArgs);
    return conditions;
  } catch (error) {
    console.error("Error deleting many conditions:", error);
    throw error;
  }
}

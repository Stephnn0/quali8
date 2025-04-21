import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export async function createQualifier(
  prismaArgs: Prisma.QualifiersCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const qualifier = await db.qualifiers.create(prismaArgs);
    return qualifier;
  } catch (error) {
    console.error("Error creating qualifier:", error);
  }
}

export async function getQualifiersByShop(
  prismaArgs: Prisma.QualifiersFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const qualifiers = await db.qualifiers.findMany(prismaArgs);
    return qualifiers;
  } catch (error) {
    console.error("Error fetching qualifiers:", error);
  }
}

export async function getQualifierById(
  prismaArgs: Prisma.QualifiersFindUniqueArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const qualifier = await db.qualifiers.findUnique(prismaArgs);
    return qualifier;
  } catch (error) {
    console.error("Error fetching qualifier:", error);
  }
}

export async function deleteQualifier(
  prismaArgs: Prisma.QualifiersDeleteArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const qualifier = await db.qualifiers.delete(prismaArgs);
    return qualifier;
  } catch (error) {
    console.error("Error deleting qualifier:", error);
  }
}

export async function updateQualifier(
  prismaArgs: Prisma.QualifiersUpdateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const qualifier = await db.qualifiers.update(prismaArgs);
    return qualifier;
  } catch (error) {
    console.error("Error updating qualifier:", error);
  }
}

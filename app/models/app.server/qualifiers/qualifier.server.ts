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

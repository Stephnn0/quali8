import type { Prisma, PrismaClient } from "@prisma/client";
import type { AppRecurringPlanFindFirstArgs } from "./types";

/**
 * Find a Recurring Plan from the database.1
 *
 * @param db - The prisma client
 * @param prismaArgs - The prisma arguments to find the recurring plan.
 * @returns recurringPlan | null - The found recurringPlan or null if an error occurred or the recurringPlan was not found.
 */
async function find<T extends AppRecurringPlanFindFirstArgs>(
  db: PrismaClient,
  prismaArgs: T,
) {
  try {
    const subscriptions = await db.recurringPlan.findFirst(prismaArgs);

    return subscriptions as Prisma.Result<
      typeof db.recurringPlan,
      T,
      "findFirst"
    >;
  } catch (error) {
    console.error("Error finding recurring plan:", error);
    throw error;
  }
}

// -------------------------------------------------------
// -------------------------------------------------------
// * ---------------  Final Export  ----------------------
// -------------------------------------------------------
// -------------------------------------------------------

export const recurringPlanModel = {
  find,
};

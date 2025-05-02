import type { FirstParam } from "app/types/utility/extendedTypescript";
import type db from "app/db.server";

export type AppRecurringPlanFindFirstArgs = FirstParam<
  typeof db.recurringPlan.findFirst
>;

import { z } from "zod";

const customerConditionSchema = z.object({
  type: z.string().min(1, "Condition type is required"),
  comparisonType: z.string().min(1, "Comparison type is required"),
  value: z.string().min(1, "Value is required"),
});

export const filterCustomersFormSchema = z.object({
  conditionLogicType: z.enum(["AND", "OR"]),
  conditions: z
    .array(customerConditionSchema)
    .min(1, "At least one condition is required"),
});

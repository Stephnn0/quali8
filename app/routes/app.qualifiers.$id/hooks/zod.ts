import { z } from "zod";

// ! logic is funny , fix later
export const conditionsSubmissionSchema = z.object({
  conditions: z
    .array(
      z.object({
        type: z
          .string()
          .refine((val) => val !== "Select a condition" && val !== "", {
            message: "Invalid condition type selected",
          }),
        comparisonType: z
          .string()
          .refine((val) => val !== "Select a value type" && val !== "", {
            message: "Invalid comparison type selected",
          }),
        value: z.string().min(1, { message: "Value is required" }),
      }),
    )
    .nonempty("You must add at least one condition."),
  conditionLogicType: z.enum(["AND", "OR"]),
});

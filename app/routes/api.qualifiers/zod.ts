import { z } from "zod";

const baseQualifierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  conditionLogicType: z.enum(["AND", "OR"]),
});

export const createQualifierSchema = baseQualifierSchema;

export const updateQualifierSchema = baseQualifierSchema.extend({
  id: z.string().min(1),
});

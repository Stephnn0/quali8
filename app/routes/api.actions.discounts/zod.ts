import type { ShippingDiscountAction } from "@prisma/client";
import { z, type ZodSchema } from "zod";

const createCode = z.literal("create");
const updateCode = z.literal("update");

const create: ZodSchema<Create> = z
  .object({
    action: createCode, // (1
    //
    shippingDiscountState: z.enum(["ENABLED", "DISABLED"]), // (2
    codeOrName: z.string(), // (3
    //
    limitUsagePerOneCustomer: z.boolean(), // (4
    //
    type: z.enum(["percentage", "fixed"]), // (5
    value: z.number().gt(0, { message: "Value must be greater than 0" }),
    //
    combinedWithOrderDiscounts: z.boolean(), // (7
    combinedWithProductDiscounts: z.boolean(), // (8
    //
    automaticOrCode: z.enum(["AUTOMATIC", "CODE"]), // (9
    //
    qualifierIds: z
      .array(z.number())
      .min(1, "At least one qualifier is required"), //  (10
    customers: z.array(z.object({ shopifyId: z.string(), id: z.number() })), // (11
    //
    shippingRateType: z.enum(["ALL_RATES", "SELECTED_RATES"]), // (12
    shippingRatesNames: z.array(z.string()), // (13
    //
    startDate: z.string(), // (14
    endDate: z.string().optional(), // (15
    hasEndDate: z.boolean(), // (16
    startTime: z.string().optional(), // (17
    endTime: z.string().optional(), // (18
  })
  .superRefine((data, context) => {
    if (data.type === "percentage") {
      if (data.value > 100) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value must be less than or equal to 100",
          path: ["value"],
        });
      }
    }
  });

const update: ZodSchema<Update> = z.object({
  action: z.literal("update"),
  id: z.number(),
  shopifyDiscountId: z.string(),
  customers: z.array(z.object({ shopifyId: z.string(), id: z.number() })),
});

const actionCodes = z.union([createCode, updateCode]);

export const zodApiActionsShippingDiscounts = {
  actionCodes,
  create,
  update,
} as const;

export type CreateBody = z.infer<typeof create>;
export type UpdateBody = z.infer<typeof update>;

type Update = Omit<
  Partial<Omit<ShippingDiscountAction, "createdAt" | "updatedAt">> &
    Required<Pick<ShippingDiscountAction, "id" | "shopifyDiscountId">>,
  "createdAt" | "updatedAt"
> & {
  action: "update";
  customers: Customer[];
};

type Create = Omit<
  Partial<
    Omit<
      ShippingDiscountAction,
      "createdAt" | "updatedAt" | "startDate" | "endDate"
    >
  > &
    Required<Pick<ShippingDiscountAction, "codeOrName">>,
  "createdAt" | "updatedAt"
> & {
  action: "create";
  customers: Customer[];
  startDate: string;
  endDate?: string;
};

export type Customer = {
  shopifyId: string;
  id: number;
};

import { z } from "zod";
import { computeBundlePricing } from "app/utils/bundlePricing";

const gid = (resource: string) =>
  z
    .string()
    .regex(
      new RegExp(`^gid://shopify/${resource}/\\d+$`),
      `Must be a Shopify ${resource} GID`,
    );

export const bundleItemSchema = z.object({
  variantId: gid("ProductVariant"),
  productId: gid("Product"),
  quantity: z.coerce.number().int().min(1).max(99),
  productTitle: z.string().trim().min(1).max(255),
  variantTitle: z.string().trim().max(255).nullish(),
  price: z.coerce.number().min(0).max(1_000_000),
  imageUrl: z.string().url().max(2048).nullish(),
});

export const bundleFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(255),
    description: z.string().trim().max(1000).nullish(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    discountPercent: z.coerce
      .number()
      .gt(0, "Discount must be greater than zero")
      .lt(100, "Discount must be less than 100%"),
    items: z
      .array(bundleItemSchema)
      .min(2, "Add at least 2 products to the bundle")
      .max(4, "A bundle can contain at most 4 products"),
  })
  .superRefine((form, ctx) => {
    const productIds = form.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "The same product appears more than once in the bundle",
      });
    }

    const { originalTotal } = computeBundlePricing(form.items, 0);
    if (originalTotal <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Bundle products must have a total price greater than zero",
      });
    }
  });

export type BundleFormInput = z.infer<typeof bundleFormSchema>;

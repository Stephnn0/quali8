import type { getActionShippingDiscount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import type { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";

export type ActionShippingDiscountLoaderData = {
  qualifiers: Awaited<ReturnType<typeof getQualifiersByShop>>;
  rates: any[]; // replace with correct type if known
  shippingDiscount?: Awaited<ReturnType<typeof getActionShippingDiscount>>;
};

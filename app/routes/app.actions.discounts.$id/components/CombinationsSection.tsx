import { BlockStack, Card, Checkbox } from "@shopify/polaris";
import type { DiscountForm } from "../hooks";
import { SectionHead } from "./SectionHead";

export function CombinationsSection({ form }: { form: DiscountForm }) {
  const { combinedWithProductDiscounts, combinedWithOrderDiscounts } =
    form.fields;

  return (
    <Card>
      <BlockStack gap="400">
        <SectionHead
          number="6"
          title="Stacking with other discounts"
          text="Let customers use this alongside product or order discounts."
        />
        <BlockStack gap="200">
          <Checkbox
            label="Product discounts"
            helpText="Sale prices and product-level discount codes."
            checked={combinedWithProductDiscounts.value}
            onChange={combinedWithProductDiscounts.onChange}
          />
          <Checkbox
            label="Order discounts"
            helpText="Cart-wide discounts such as “$10 off your order”."
            checked={combinedWithOrderDiscounts.value}
            onChange={combinedWithOrderDiscounts.onChange}
          />
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

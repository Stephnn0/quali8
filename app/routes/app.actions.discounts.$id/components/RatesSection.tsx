import { Banner, BlockStack, Card, Checkbox } from "@shopify/polaris";
import { DeliveryIcon, ListBulletedIcon } from "@shopify/polaris-icons";
import type { DiscountForm } from "../hooks";
import { ChoiceTiles } from "./ChoiceTiles";
import { SectionHead } from "./SectionHead";
import styles from "../../app.actions.discounts/smartShipping.module.css";

export function RatesSection({ form }: { form: DiscountForm }) {
  const { shippingRateType, shippingRatesNames } = form.fields;
  const selectedMode = shippingRateType.value === "SELECTED_RATES";

  const toggleRate = (name: string, checked: boolean) => {
    const next = checked
      ? [...shippingRatesNames.value, name]
      : shippingRatesNames.value.filter((entry) => entry !== name);
    shippingRatesNames.onChange(next);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <SectionHead
          number="4"
          title="Which shipping rates"
          text="Discount every rate you offer, or only some of them."
        />
        <ChoiceTiles
          name="Shipping rates"
          value={shippingRateType.value}
          onChange={shippingRateType.onChange}
          options={[
            {
              value: "ALL_RATES",
              label: "All rates",
              description: "Every shipping option at checkout.",
              icon: DeliveryIcon,
            },
            {
              value: "SELECTED_RATES",
              label: "Selected rates",
              description: "Only the rates you tick below.",
              icon: ListBulletedIcon,
            },
          ]}
        />
        {selectedMode ? (
          <BlockStack gap="300">
            {form.rates.length > 0 ? (
              <div className={styles.checklist}>
                {form.rates.map((rate) => {
                  const checked = shippingRatesNames.value.includes(rate.name);
                  return (
                    <div
                      key={rate.id}
                      className={`${styles.checkRow} ${
                        checked ? styles.checkRowSelected : ""
                      }`}
                    >
                      <Checkbox
                        label={rate.name}
                        checked={checked}
                        onChange={(value) => toggleRate(rate.name, value)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.checkEmpty}>
                <span>
                  No shipping rates found. Add rates in Shopify under Settings
                  → Shipping and delivery, then reload this page.
                </span>
              </div>
            )}
            <Banner tone="info">
              <p>
                Rates are matched by name. Give each rate a unique name in your
                shipping settings so the discount lands on the right one.
              </p>
            </Banner>
          </BlockStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}

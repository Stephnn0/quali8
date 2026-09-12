import { useState } from "react";
import { BlockStack, Card, InlineGrid, TextField } from "@shopify/polaris";
import { CashDollarIcon, DiscountIcon } from "@shopify/polaris-icons";
import type { DiscountForm } from "../hooks";
import { ChoiceTiles } from "./ChoiceTiles";
import { SectionHead } from "./SectionHead";
import styles from "../../app.actions.discounts/smartShipping.module.css";

const PERCENT_PICKS = [
  { label: "Free shipping", value: 100 },
  { label: "50%", value: 50 },
  { label: "25%", value: 25 },
  { label: "10%", value: 10 },
];
const FIXED_PICKS = [
  { label: "$5", value: 5 },
  { label: "$10", value: 10 },
  { label: "$15", value: 15 },
];

export function ValueSection({ form }: { form: DiscountForm }) {
  const { type, valueType } = form.fields;
  const isPercentage = type.value === "percentage";
  const [text, setText] = useState(
    valueType.value ? String(valueType.value) : "",
  );

  const setValue = (next: number) => {
    setText(next ? String(next) : "");
    valueType.onChange(next);
  };

  const picks = isPercentage ? PERCENT_PICKS : FIXED_PICKS;

  return (
    <Card>
      <BlockStack gap="400">
        <SectionHead
          number="2"
          title="How much off shipping"
          text="Take a percentage off the rate, or a fixed amount."
        />
        <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400" alignItems="start">
          <ChoiceTiles
            name="Discount type"
            value={type.value}
            onChange={(next) => {
              type.onChange(next);
              setValue(0);
            }}
            options={[
              {
                value: "percentage",
                label: "Percentage",
                description: "100% makes shipping free.",
                icon: DiscountIcon,
              },
              {
                value: "fixed",
                label: "Fixed amount",
                description: "Take a set amount off the rate.",
                icon: CashDollarIcon,
              },
            ]}
          />
          <TextField
            label={isPercentage ? "Percentage off" : "Amount off"}
            type="number"
            inputMode="decimal"
            min={0}
            max={isPercentage ? 100 : undefined}
            suffix={isPercentage ? "%" : undefined}
            prefix={isPercentage ? undefined : "$"}
            value={text}
            onChange={(next) => {
              setText(next);
              valueType.onChange(Number(next) || 0);
            }}
            error={form.errors.value ?? undefined}
            autoComplete="off"
            placeholder={isPercentage ? "100" : "5"}
          />
        </InlineGrid>
        <div className={styles.chips}>
          {picks.map((pick) => (
            <button
              key={pick.value}
              type="button"
              className={`${styles.chip} ${
                valueType.value === pick.value ? styles.chipSelected : ""
              }`}
              onClick={() => setValue(pick.value)}
            >
              {pick.label}
            </button>
          ))}
        </div>
      </BlockStack>
    </Card>
  );
}

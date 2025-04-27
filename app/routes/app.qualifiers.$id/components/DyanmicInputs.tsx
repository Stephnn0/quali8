import { TextField } from "@shopify/polaris";
import type { Condition } from "./NewConditions";

type Props = {
  condition: Condition;
  index: number;
  onChange: (index: number, field: keyof Condition, value: string) => void;
};

export const conditionInputMap = {
  customer_tag: { inputType: "text", placeholder: "e.g. VIP" },
  customer_order_count: { inputType: "number", placeholder: "e.g. 5" },
  customer_email: { inputType: "text", placeholder: "e.g. user@example.com" },
  customer_country: { inputType: "text", placeholder: "e.g. Canada" },
  customer_amount_spent: { inputType: "currency", placeholder: "e.g. 100.00" },
};

export function ConditionValueInput({ condition, index, onChange }: Props) {
  // ! TYPE GUARD
  const config =
    condition.type in conditionInputMap
      ? conditionInputMap[condition.type as keyof typeof conditionInputMap]
      : null;

  if (!config) {
    return (
      <TextField
        labelHidden
        label="Value"
        value={condition.value}
        onChange={(value) => onChange(index, "value", value)}
        autoComplete="off"
      />
    );
  }

  switch (config.inputType) {
    case "number":
      return (
        <TextField
          labelHidden
          label="Value"
          type="number"
          inputMode="numeric"
          value={condition.value}
          onChange={(value) => onChange(index, "value", value)}
          autoComplete="off"
          placeholder={config.placeholder}
        />
      );
    case "currency":
      return (
        <TextField
          labelHidden
          label="Value"
          type="number"
          inputMode="decimal"
          prefix="$"
          value={condition.value}
          onChange={(value) => onChange(index, "value", value)}
          autoComplete="off"
          placeholder={config.placeholder}
        />
      );
    default:
      return (
        <TextField
          labelHidden
          label="Value"
          type="text"
          value={condition.value}
          onChange={(value) => onChange(index, "value", value)}
          autoComplete="off"
          placeholder={config.placeholder}
        />
      );
  }
}

import { TextField } from "@shopify/polaris";
import type { Condition } from "./NewConditions";

type Props = {
  condition: Condition;
  index: number;
  onChange: (index: number, field: keyof Condition, value: string) => void;
};

// 🧠 Updated map with unique input types + placeholders
export const conditionInputMap = {
  customer_tag: { inputType: "text", placeholder: "e.g. VIP" },
  customer_order_count: { inputType: "number", placeholder: "e.g. 5" },
  customer_email: { inputType: "email", placeholder: "e.g. user@example.com" },
  customer_country: { inputType: "text", placeholder: "e.g. Canada" },
  customer_amount_spent: {
    inputType: "currency",
    placeholder: "e.g. 100.00",
  },
  updated_at: {
    inputType: "date",
    placeholder: "e.g. 2024-12-31",
  },
  tag_not: {
    inputType: "text",
    placeholder: "e.g. NOT_VIP",
  },
  order_date: {
    inputType: "date",
    placeholder: "e.g. 2024-12-31",
  },
  last_name: {
    inputType: "text",
    placeholder: "e.g. Smith",
  },
  last_abandoned_order_date: {
    inputType: "date",
    placeholder: "e.g. 2024-12-31",
  },
  first_name: {
    inputType: "text",
    placeholder: "e.g. John",
  },
  customer_date: {
    inputType: "date",
    placeholder: "e.g. 2024-01-01",
  },
  accepts_marketing: {
    inputType: "boolean",
    placeholder: "true or false",
  },
};

export function ConditionValueInput({ condition, index, onChange }: Props) {
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
    case "email":
      return (
        <TextField
          labelHidden
          label="Value"
          type="email"
          value={condition.value}
          onChange={(value) => onChange(index, "value", value)}
          autoComplete="email"
          placeholder={config.placeholder}
        />
      );
    case "date":
      return (
        <TextField
          labelHidden
          label="Value"
          type="date"
          value={condition.value}
          onChange={(value) => onChange(index, "value", value)}
          autoComplete="off"
          placeholder={config.placeholder}
        />
      );
    case "boolean":
      return (
        <TextField
          labelHidden
          label="Value"
          type="text"
          value={condition.value}
          onChange={(value) => onChange(index, "value", value)}
          autoComplete="off"
          placeholder={config.placeholder}
          helpText="Enter true or false"
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

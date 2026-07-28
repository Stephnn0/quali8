import { Select, TextField } from "@shopify/polaris";

type InputKind = "text" | "number" | "currency" | "email" | "date" | "boolean";

const inputKindMap: Record<string, { kind: InputKind; placeholder?: string }> =
  {
    customer_tag: { kind: "text", placeholder: "e.g. VIP" },
    tag_not: { kind: "text", placeholder: "e.g. wholesale" },
    customer_order_count: { kind: "number", placeholder: "e.g. 5" },
    customer_amount_spent: { kind: "currency", placeholder: "e.g. 100.00" },
    customer_email: { kind: "email", placeholder: "e.g. user@example.com" },
    customer_country: { kind: "text", placeholder: "e.g. United States" },
    first_name: { kind: "text", placeholder: "e.g. John" },
    last_name: { kind: "text", placeholder: "e.g. Smith" },
    customer_date: { kind: "date" },
    updated_at: { kind: "date" },
    order_date: { kind: "date" },
    last_abandoned_order_date: { kind: "date" },
    accepts_marketing: { kind: "boolean" },
  };

type Props = {
  type: string;
  value: string;
  onChange: (value: string) => void;
};

export function ConditionValueInput({ type, value, onChange }: Props) {
  const config = inputKindMap[type] ?? { kind: "text" as const };

  if (config.kind === "boolean") {
    return (
      <Select
        labelHidden
        label="Value"
        options={[
          { label: "Select…", value: "" },
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ]}
        value={value}
        onChange={onChange}
      />
    );
  }

  const typeAttr =
    config.kind === "currency"
      ? "number"
      : config.kind === "number"
        ? "number"
        : config.kind === "email"
          ? "email"
          : config.kind === "date"
            ? "date"
            : "text";

  return (
    <TextField
      labelHidden
      label="Value"
      type={typeAttr}
      inputMode={
        config.kind === "currency"
          ? "decimal"
          : config.kind === "number"
            ? "numeric"
            : undefined
      }
      prefix={config.kind === "currency" ? "$" : undefined}
      value={value}
      onChange={onChange}
      autoComplete="off"
      placeholder={config.placeholder}
      disabled={!type}
    />
  );
}

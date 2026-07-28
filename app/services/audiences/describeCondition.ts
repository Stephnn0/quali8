/**
 * Turns a stored `Conditions` row into merchant-readable copy, e.g.
 * "Order count > 3", 'Tagged "VIP"'. Client-safe (no server imports).
 */

type ConditionLike = {
  type: string;
  comparisonType: string;
  value: string;
};

const FIELD_LABELS: Record<string, string> = {
  customer_tag: "Tag",
  tag_not: "Tag",
  customer_order_count: "Order count",
  customer_email: "Email",
  customer_country: "Country",
  customer_amount_spent: "Total spent",
  updated_at: "Updated",
  order_date: "Order date",
  last_abandoned_order_date: "Last abandoned checkout",
  customer_date: "Customer since",
  first_name: "First name",
  last_name: "Last name",
};

const COMPARISON_LABELS: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  greater_than: ">",
  less_than: "<",
  greater_than_equals: "≥",
  less_than_equals: "≤",
};

export function describeCondition(condition: ConditionLike): string {
  const { type, comparisonType, value } = condition;

  if (type === "customer_tag") return `Tagged "${value}"`;
  if (type === "tag_not") return `Not tagged "${value}"`;

  const field = FIELD_LABELS[type] ?? type;
  const comparison = COMPARISON_LABELS[comparisonType] ?? comparisonType;
  return `${field} ${comparison} ${value}`;
}

export const typeOptions = [
  { label: "Select a condition", value: "" },
  { label: "Customer tag", value: "customer_tag" },
  { label: "Doesn't have tag", value: "tag_not" },
  { label: "Order count", value: "customer_order_count" },
  { label: "Amount spent", value: "customer_amount_spent" },
  { label: "Country", value: "customer_country" },
  { label: "Email", value: "customer_email" },
  { label: "First name", value: "first_name" },
  { label: "Last name", value: "last_name" },
  { label: "Created date", value: "customer_date" },
  { label: "Last updated", value: "updated_at" },
  { label: "Order date", value: "order_date" },
  { label: "Abandoned checkout date", value: "last_abandoned_order_date" },
  { label: "Accepts marketing", value: "accepts_marketing" },
];

const numericComparisons = [
  { label: "is equal to", value: "equals" },
  { label: "is greater than", value: "greater_than" },
  { label: "is less than", value: "less_than" },
  { label: "is greater than or equal to", value: "greater_than_equals" },
  { label: "is less than or equal to", value: "less_than_equals" },
];

const dateComparisons = [
  { label: "is on", value: "equals" },
  { label: "is after", value: "greater_than" },
  { label: "is before", value: "less_than" },
];

const textComparisons = [
  { label: "is", value: "equals" },
  { label: "is not", value: "not_equals" },
];

export const comparisonTypeMap: Record<
  string,
  { label: string; value: string }[]
> = {
  customer_tag: [{ label: "is", value: "equals" }],
  tag_not: [{ label: "is", value: "equals" }],
  customer_order_count: numericComparisons,
  customer_amount_spent: numericComparisons,
  customer_email: textComparisons,
  customer_country: textComparisons,
  first_name: textComparisons,
  last_name: textComparisons,
  customer_date: dateComparisons,
  updated_at: dateComparisons,
  order_date: [
    { label: "was placed on", value: "equals" },
    { label: "was placed after", value: "greater_than" },
    { label: "was placed before", value: "less_than" },
  ],
  last_abandoned_order_date: [
    { label: "happened on", value: "equals" },
    { label: "happened after", value: "greater_than" },
    { label: "happened before", value: "less_than" },
  ],
  accepts_marketing: [{ label: "is", value: "equals" }],
};

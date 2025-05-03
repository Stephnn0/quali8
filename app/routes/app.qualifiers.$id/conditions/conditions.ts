export const typeOptions = [
  { label: "Select a condition", value: "" }, // ⬅️ default placeholder
  { label: "Customer Tag", value: "customer_tag" },
  { label: "Customer Order Count", value: "customer_order_count" },
  { label: "Customer Email", value: "customer_email" },
  { label: "Customer Country", value: "customer_country" },
  { label: "Customer Amount Spent", value: "customer_amount_spent" },
  { label: "Latest Date Customer Was Updated", value: "updated_at" },
  { label: "Customer Tag (Not)", value: "tag_not" },
  { label: "Customer Order Date", value: "order_date" },
  { label: "Customer Last Name", value: "last_name" },
  { label: "Last Abandoned Order Date", value: "last_abandoned_order_date" },
  { label: "Customer First Name", value: "first_name" },
  { label: "Customer Created Date", value: "customer_date" },
  { label: "Accepts Marketing", value: "accepts_marketing" },
];

export const comparisonTypeOptions = [
  { label: "Select a value type", value: "" }, // ⬅️ default placeholder
  { label: "is equal to", value: "equals" },
  { label: "is not equal to", value: "not_equals" },
];

export const comparisonTypeMap: Record<
  string,
  { label: string; value: string }[]
> = {
  customer_tag: [{ label: "is equal to", value: "equals" }],
  customer_order_count: [
    { label: "is equal to", value: "equals" },
    { label: "is greater than", value: "greater_than" },
    { label: "is less than", value: "less_than" },
    { label: "is greater than or equal to", value: "greater_than_equals" },
    { label: "is less than or equal to", value: "less_than_equals" },
  ],
  customer_email: [{ label: "is equal to", value: "equals" }],
  customer_country: [{ label: "is equal to", value: "equals" }],
  customer_amount_spent: [
    { label: "is equal to", value: "equals" },
    { label: "is greater than", value: "greater_than" },
    { label: "is less than", value: "less_than" },
    { label: "is greater than or equal to", value: "greater_than_equals" },
    { label: "is less than or equal to", value: "less_than_equals" },
  ],
  updated_at: [{ label: "is equal to", value: "equals" }],
  tag_not: [{ label: "is equal to", value: "equals" }],
  order_date: [
    { label: "was placed on", value: "equals" },
    { label: "was placed after", value: "greater_than" },
    { label: "was placed before", value: "less_than" },
  ],
  last_name: [{ label: "is equal to", value: "equals" }],
  last_abandoned_order_date: [
    { label: "happend on", value: "equals" },
    { label: "happend after", value: "greater_than" },
    { label: "happend before", value: "less_than" },
  ],
  first_name: [{ label: "is equal to", value: "equals" }],
  customer_date: [{ label: "is equal to", value: "equals" }],
  accepts_marketing: [{ label: "is", value: "equals" }],
};

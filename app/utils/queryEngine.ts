export function buildCustomerQuery(
  conditions: Condition[],
  logic: "AND" | "OR" = "AND",
): string {
  return conditions
    .filter((cond) => cond.value && cond.type)
    .map(({ type, comparisonType, value }) => {
      const field = typeMapping[type];
      const comparison = comparisonMapping[comparisonType] ?? "";

      if (!field) return "";

      if (comparisonType === "not-equals") {
        return `-${field}:${value}`;
      }

      return `${field}:${comparison}${value}`;
    })
    .filter(Boolean)
    .join(logic === "AND" ? " " : " OR "); // space for AND, OR for OR
}

type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

const typeMapping: Record<string, string> = {
  customer_tag: "tag",
  customer_order_count: "orders_count",
  customer_email: "email",
  customer_country: "country",
  customer_amount_spent: "total_spent",
  updated_at: "updated_at",
  tag_not: "tag_not",
  order_date: "order_date",
  last_name: "last_name",
  last_abandoned_order_date: "last_abandoned_order_date",
  first_name: "first_name",
  customer_date: "created_at",
  accepts_marketing: "accepts_marketing",
};

const comparisonMapping: Record<string, string> = {
  equals: "",
  greater_than: ">",
  less_than: "<",
  greater_than_equals: ">=",
  less_than_equals: "<=",
};

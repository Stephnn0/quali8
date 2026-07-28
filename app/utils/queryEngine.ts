type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

/** Shopify customer search field for each condition type. */
const typeMapping: Record<string, string> = {
  customer_tag: "tag",
  customer_order_count: "orders_count",
  customer_email: "email",
  customer_country: "country",
  customer_amount_spent: "total_spent",
  updated_at: "updated_at",
  // No `tag_not` field exists in Shopify's search syntax — negation is
  // expressed by prefixing the term with `-` (handled below).
  tag_not: "tag",
  order_date: "order_date",
  last_name: "last_name",
  last_abandoned_order_date: "last_abandoned_order_date",
  first_name: "first_name",
  customer_date: "customer_date",
  accepts_marketing: "accepts_marketing",
};

const comparisonMapping: Record<string, string> = {
  equals: "",
  greater_than: ">",
  less_than: "<",
  greater_than_equals: ">=",
  less_than_equals: "<=",
};

/** Values with whitespace must be quoted or Shopify parses them as two terms. */
function formatValue(value: string): string {
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }
  return trimmed;
}

/**
 * Builds a Shopify customer search query from stored conditions.
 * https://shopify.dev/docs/api/usage/search-syntax
 */
export function buildCustomerQuery(
  conditions: Condition[],
  logic: "AND" | "OR" = "AND",
): string {
  return conditions
    .filter((cond) => cond.value && cond.type)
    .map(({ type, comparisonType, value }) => {
      const field = typeMapping[type];
      if (!field) return "";

      const negated = type === "tag_not" || comparisonType === "not_equals";
      const comparison = comparisonMapping[comparisonType] ?? "";
      const term = `${field}:${negated ? "" : comparison}${formatValue(value)}`;

      return negated ? `-${term}` : term;
    })
    .filter(Boolean)
    .join(logic === "AND" ? " " : " OR ");
}

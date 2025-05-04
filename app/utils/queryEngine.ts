type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

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

const typeMapping: Record<string, string> = {
  customer_tag: "tag", // -------------------------------- WORKING
  customer_order_count: "orders_count", // --------------- WORKING
  customer_email: "email", // ---------------------------- WORKING
  customer_country: "country", // ------------------------ WORKING
  customer_amount_spent: "total_spent", // --------------  WORKING
  updated_at: "updated_at", // ---------------------------- WORKING
  tag_not: "tag_not", // ---------------------------------- WORKING
  order_date: "order_date", // -----------------------------WORKING
  last_name: "last_name", // ------------------------------ WORKING
  last_abandoned_order_date: "last_abandoned_order_date", // WORKING
  first_name: "first_name", // ---------------------------- WORKING
  customer_date: "customer_date", // ---------------------- WORKING
  accepts_marketing: "accepts_marketing", // -------------- WORKING
};

const comparisonMapping: Record<string, string> = {
  equals: "",
  greater_than: ">",
  less_than: "<",
  greater_than_equals: ">=",
  less_than_equals: "<=",
};

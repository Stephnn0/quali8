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
    .join(logic === "AND" ? " " : " OR"); // space for AND, OR for OR
}

type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

const typeMapping: Record<string, string> = {
  "customer-tag": "tag",
  "customer-order-count": "orders_count",
  "customer-email": "email",
  "customer-cities": "city",
  "customer-amount-spent": "amount_spent",
};

const comparisonMapping: Record<string, string> = {
  equals: "",
  "greater-than": ">",
  "less-than": "<",
  "greater-than-equals": ">=",
  "less-than-equals": "<=",
};

import type { DiscountForm } from "../hooks";
import styles from "../../app.actions.discounts/smartShipping.module.css";

const shortDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
};

/** Live, plain-language readout of what the merchant is about to create. */
export function SummaryCard({ form }: { form: DiscountForm }) {
  const f = form.fields;
  const value = f.valueType.value;

  const amount =
    f.type.value === "percentage"
      ? value >= 100
        ? "Free"
        : value > 0
          ? `${value}% off`
          : "…% off"
      : value > 0
        ? `$${value} off`
        : "$… off";

  const audienceCount = f.qualifierIds.value.length;
  const who = f.appliesToAllCustomers.value
    ? "everyone"
    : audienceCount === 0
      ? "no audience yet"
      : audienceCount === 1
        ? (form.audiences.find((a) => String(a.id) === f.qualifierIds.value[0])
            ?.name ?? "1 audience")
        : `${audienceCount} audiences`;

  const start = shortDate(f.startDate.value);
  const end = f.hasEndDate.value ? shortDate(f.endDate.value) : null;

  const stacks = [
    f.combinedWithProductDiscounts.value ? "product" : null,
    f.combinedWithOrderDiscounts.value ? "order" : null,
  ].filter(Boolean);

  const rows: Array<[string, string]> = [
    [
      "Method",
      f.automaticOrCode.value === "CODE"
        ? f.code.value
          ? `Code ${f.code.value.trim().toUpperCase()}`
          : "Code (not set)"
        : "Automatic",
    ],
    ["Who qualifies", who],
    [
      "Minimum cart",
      f.isMinimumCartValueEnabled.value && f.minimumCartValue.value > 0
        ? `$${f.minimumCartValue.value}`
        : "None",
    ],
    [
      "Rates",
      f.shippingRateType.value === "ALL_RATES"
        ? "All rates"
        : `${f.shippingRatesNames.value.length} selected`,
    ],
    ["Starts", start ? `${start} ${f.startTime.value}`.trim() : "Right away"],
    ["Ends", end ? `${end} ${f.endTime.value}`.trim() : "No end date"],
    ["Stacks with", stacks.length ? `${stacks.join(" and ")} discounts` : "Nothing"],
  ];

  return (
    <aside className={styles.summary}>
      <p className={styles.summaryEyebrow}>At checkout</p>
      <h2 className={styles.summaryHeadline}>
        <span>{amount}</span> shipping for {who}
      </h2>
      <ul className={styles.summaryList}>
        {rows.map(([key, val]) => (
          <li key={key} className={styles.summaryItem}>
            <span className={styles.summaryKey}>{key}</span>
            <span className={styles.summaryValue}>{val}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

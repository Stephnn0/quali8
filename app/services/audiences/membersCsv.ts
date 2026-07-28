/** CSV for audience member export. Client-safe (used from the editor UI). */

export type CsvMember = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  country: string | null;
  amountSpent: string | null;
  orderCount: number | null;
};

const HEADER = "first_name,last_name,email,country,total_spent,order_count";

function escapeField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function membersToCsv(members: CsvMember[]): string {
  const rows = members.map((m) =>
    [m.firstName, m.lastName, m.email, m.country, m.amountSpent, m.orderCount]
      .map(escapeField)
      .join(","),
  );
  return [HEADER, ...rows].join("\n");
}

export function combineDateAndTime(
  dateString: string,
  timeString: string,
): string {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  // Combine and return in UTC format string
  return `${yyyy}-${mm}-${dd}T${timeString}:00Z`;
}

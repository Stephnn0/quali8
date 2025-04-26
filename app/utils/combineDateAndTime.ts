export function combineDateAndTime(
  dateString: string,
  timeString: string,
): string {
  const date = new Date(dateString);
  const [time, modifier] = timeString.trim().split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier?.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;

  date.setHours(hours);
  date.setMinutes(minutes || 0);
  date.setSeconds(0);
  return date.toISOString();
}

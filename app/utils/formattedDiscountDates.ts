import { combineDateAndTime } from "./combineDateAndTime";

export function getFormattedDiscountDates(parsedBody: {
  hasEndDate: boolean | undefined;
  shippingDiscountState: "ENABLED" | "DISABLED";
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}) {
  const {
    hasEndDate,
    shippingDiscountState,
    startDate,
    startTime,
    endDate,
    endTime,
  } = parsedBody;

  let formattedStartDate = combineDateAndTime(
    startDate,
    startTime || "12:00 AM",
  );
  let formattedEndDate = hasEndDate
    ? combineDateAndTime(endDate!, endTime!)
    : "2028-11-01T00:00:00Z";

  if (shippingDiscountState === "DISABLED") {
    formattedStartDate = "2023-01-01T00:00:00Z";
    formattedEndDate = "2023-11-01T00:00:00Z";
  }

  return { formattedStartDate, formattedEndDate };
}

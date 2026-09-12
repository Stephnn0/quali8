import { useEffect, useState } from "react";
import { BlockStack, Card, Checkbox, InlineGrid, Select } from "@shopify/polaris";
import CustomDatePicker from "./DatePicker";
import type { DiscountForm } from "../hooks";
import { SectionHead } from "./SectionHead";

const pad = (n: number) => String(n).padStart(2, "0");

const currentTime = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const isToday = (date: Date) => {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const value = `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`;
  return { label: value, value };
});

/** Half-hour slots, plus the exact current time when the day is today. */
const timeOptions = (date: Date, current: string, selected: string) => {
  const options = HALF_HOURS.filter(
    (option) => !isToday(date) || option.value >= current,
  );
  for (const extra of [current, selected]) {
    if (extra && !options.some((option) => option.value === extra)) {
      options.unshift({ label: extra, value: extra });
    }
  }
  return options.sort((a, b) => a.value.localeCompare(b.value));
};

export function ScheduleSection({ form }: { form: DiscountForm }) {
  const { startDate, startTime, endDate, endTime, hasEndDate } = form.fields;
  const [now] = useState(currentTime);

  const [start, setStart] = useState(() =>
    startDate.value ? new Date(startDate.value) : new Date(),
  );
  const [end, setEnd] = useState(() =>
    endDate.value ? new Date(endDate.value) : new Date(),
  );

  // Fill in defaults so a discount always has a start; clear the end when
  // the merchant turns it off.
  useEffect(() => {
    if (!startDate.value) startDate.onChange(String(start));
    if (!startTime.value) startTime.onChange(now);
    if (hasEndDate.value) {
      if (!endDate.value) endDate.onChange(String(end));
      if (!endTime.value) endTime.onChange(now);
    } else {
      if (endDate.value) endDate.onChange("");
      if (endTime.value) endTime.onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEndDate.value]);

  return (
    <Card>
      <BlockStack gap="400">
        <SectionHead
          number="5"
          title="When it runs"
          text="Starts right away unless you pick a later date. Add an end date for a limited-time offer."
        />
        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
          <CustomDatePicker
            label="Start date"
            selectedDate={start}
            setSelectedDate={(date) => {
              setStart(date);
              startDate.onChange(String(date));
            }}
          />
          <Select
            label="Start time"
            options={timeOptions(start, now, startTime.value)}
            value={startTime.value || now}
            onChange={startTime.onChange}
          />
        </InlineGrid>
        <Checkbox
          label="Set an end date"
          checked={hasEndDate.value}
          onChange={hasEndDate.onChange}
        />
        {hasEndDate.value ? (
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
            <CustomDatePicker
              label="End date"
              selectedDate={end}
              setSelectedDate={(date) => {
                setEnd(date);
                endDate.onChange(String(date));
              }}
            />
            <Select
              label="End time"
              options={timeOptions(end, now, endTime.value)}
              value={endTime.value || now}
              onChange={endTime.onChange}
            />
          </InlineGrid>
        ) : null}
      </BlockStack>
    </Card>
  );
}

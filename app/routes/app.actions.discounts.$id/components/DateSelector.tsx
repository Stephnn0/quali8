import { useCallback, useEffect, useState } from "react";
import {
  InlineGrid,
  Layout,
  Card,
  Select,
  Checkbox,
  Text,
} from "@shopify/polaris";
import CustomDatePicker from "./DatePicker";
import type { DiscountForm } from "../hooks";

type DateSelectorProps = {
  form: DiscountForm;
};

const getCurrentTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const formatted = `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
  return formatted; // e.g., "9:04 PM"
};

export default function DateSelector({ form }: DateSelectorProps) {
  const currentTime = getCurrentTime();

  const [selectedStartHour, setSelectedStartHour] = useState(currentTime);
  const [selectedEndHour, setSelectedEndHour] = useState(currentTime);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());

  const baseHourOptions = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour24 = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? "00" : "30";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const suffix = hour24 < 12 ? "AM" : "PM";
    const formatted = `${hour12}:${minutes} ${suffix}`;

    return {
      label: formatted,
      value: `${hour24}:${minutes}`, // e.g., "13:30"
    };
  });

  // If current time isn't in base options, add it at the top
  const isCurrentTimeInOptions = baseHourOptions.some(
    (opt) => opt.value === currentTime,
  );

  const hourOptions = isCurrentTimeInOptions
    ? baseHourOptions
    : [
        {
          label: `${currentTime}`,
          value: currentTime,
        },
        ...baseHourOptions,
      ];

  const { fields } = form;
  const { startDate, startTime, endDate, endTime, hasEndDate } = fields;

  useEffect(() => {
    if (!startDate.value) startDate.onChange(String(selectedDate));
    if (!startTime.value) startTime.onChange(currentTime);

    if (hasEndDate.value) {
      if (!endDate.value) endDate.onChange(String(selectedEndDate));
      if (!endTime.value) endTime.onChange(currentTime);
    } else {
      // Optionally clear these if hasEndDate is false
      endDate.onChange("");
      endTime.onChange("");
    }
  }, [
    hasEndDate.value,
    selectedDate,
    selectedEndDate,
    selectedEndHour,
    selectedStartHour,
  ]); // ! should be empty cause it causes a re-render infinite loop

  const handleStartDateChange = useCallback(
    (newDate: Date) => {
      setSelectedDate(newDate);
      startDate.onChange(String(newDate));
    },
    [startDate],
  );

  const handleEndDateChange = useCallback(
    (newDate: Date) => {
      setSelectedEndDate(newDate);
      endDate.onChange(String(newDate));
    },
    [endDate],
  );

  const handleStartTimeChange = useCallback(
    (newTime: string) => {
      setSelectedStartHour(newTime);
      startTime.onChange(newTime);
    },
    [startTime],
  );

  const handleEndTimeChange = useCallback(
    (newTime: string) => {
      setSelectedEndHour(newTime);
      endTime.onChange(newTime);
    },
    [endTime],
  );

  return (
    <Card>
      <Layout.Section>
        <Text variant="bodyMd" as="p" fontWeight="bold">
          Date and Time Selector
        </Text>
        <br />
        <Text variant="bodyMd" as="p" fontWeight="regular">
          Select the start and end date and time for the discount.
        </Text>
      </Layout.Section>
      <Layout.Section>
        <InlineGrid columns={2}>
          <CustomDatePicker
            selectedDate={selectedDate}
            setSelectedDate={handleStartDateChange}
            label="Start date"
          />

          <div style={{ paddingLeft: "10px" }}>
            <Select
              label="Start time (EDT)"
              options={hourOptions}
              value={selectedStartHour}
              onChange={handleStartTimeChange}
            />
          </div>
        </InlineGrid>
      </Layout.Section>

      <Layout.Section>
        <Checkbox
          label="Set end date"
          checked={hasEndDate.value}
          onChange={(val) => hasEndDate.onChange(val)}
        />
      </Layout.Section>

      {hasEndDate.value && (
        <Layout.Section>
          <InlineGrid columns={2}>
            <CustomDatePicker
              selectedDate={selectedEndDate}
              setSelectedDate={handleEndDateChange}
              label="End date"
            />

            <div style={{ paddingLeft: "10px" }}>
              <Select
                label="End time (EDT)"
                options={hourOptions}
                value={selectedEndHour}
                onChange={handleEndTimeChange}
              />
            </div>
          </InlineGrid>
        </Layout.Section>
      )}
    </Card>
  );
}

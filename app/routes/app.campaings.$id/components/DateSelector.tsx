import { useCallback, useEffect, useState } from "react";
import { InlineGrid, Layout, Card, Text } from "@shopify/polaris";
import { CampaingForm } from "../hooks";
import CustomDatePicker from "~/routes/app.actions.discounts.$id/components/DatePicker";

type DateSelectorsCampaingProps = {
  form: CampaingForm;
};

export default function DateSelectorsCampaing({ form }: DateSelectorsCampaingProps) {
  const { fields } = form;
  const { startAt, endAt } = fields;

  // Use today's date as fallback if value is null/empty/undefined/invalid
  const today = new Date();
  // Helper to check if string is a valid date
  function isValidDate(d: Date) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  const initialStartDate = startAt.value ? new Date(startAt.value) : today;
  const initialEndDate = endAt.value ? new Date(endAt.value) : today;

  const [selectedStartDate, setSelectedStartDate] = useState<Date>(
    isValidDate(initialStartDate) ? initialStartDate : today
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(
    isValidDate(initialEndDate) ? initialEndDate : today
  );

  // If these values are empty on component mount, update form fields to today's date
  useEffect(() => {
    if (!startAt.value) {
      startAt.onChange(today.toISOString());
    }
    if (!endAt.value) {
      endAt.onChange(today.toISOString());
    }
    // We only want this to run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartDateChange = useCallback(
    (newDate: Date) => {
      setSelectedStartDate(newDate);
      startAt.onChange(newDate.toISOString());
    },
    [startAt]
  );

  const handleEndDateChange = useCallback(
    (newDate: Date) => {
      setSelectedEndDate(newDate);
      endAt.onChange(newDate.toISOString());
    },
    [endAt]
  );

  return (
    <Card>
      <Layout.Section>
        <InlineGrid columns={2} gap="400">
          <div style={{ paddingRight: "12px" }}>
            <CustomDatePicker
              selectedDate={selectedStartDate}
              setSelectedDate={handleStartDateChange}
              label="Start date"
            />
          </div>
          <div style={{ paddingLeft: "12px" }}>
            <CustomDatePicker
              selectedDate={selectedEndDate}
              setSelectedDate={handleEndDateChange}
              label="End date"
            />
          </div>
        </InlineGrid>
      </Layout.Section>
      <Layout.Section>
        <Text variant="bodyMd" as="p">
          Select the start and end dates for the campaign.
        </Text>
      </Layout.Section>
    </Card>
  );
}

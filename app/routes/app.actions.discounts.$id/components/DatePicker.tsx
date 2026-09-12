import { CalendarIcon } from "@shopify/polaris-icons";
import { Card, Popover, DatePicker, TextField, Icon } from "@shopify/polaris";
import { useEffect, useState } from "react";

type DatePickerProps = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  label: string;
};

export default function CustomDatePicker({
  selectedDate,
  setSelectedDate,
  label,
}: DatePickerProps) {
  const [visible, setVisible] = useState(false);

  const [{ month, year }, setDate] = useState({
    month: selectedDate.getMonth(),
    year: selectedDate.getFullYear(),
  });

  // Local calendar date; toISOString() would shift to the UTC day.
  const formattedValue = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, "0"),
    String(selectedDate.getDate()).padStart(2, "0"),
  ].join("-");

  // Disable dates before today
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison
  const disableDatesBefore = today;

  function handleOnClose() {
    setVisible(false);
  }

  function handleDateChange({ end: newSelectedDate }: any) {
    setSelectedDate(newSelectedDate);
    setVisible(false);
  }

  function handleMonthChange(month: any, year: any) {
    setDate({ month, year });
  }

  useEffect(() => {
    if (selectedDate) {
      setDate({
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear(),
      });
    }
  }, [selectedDate]);

  return (
    <Popover
      active={visible}
      autofocusTarget="none"
      preferredAlignment="left"
      fullWidth
      preferInputActivator={false}
      preferredPosition="below"
      preventCloseOnChildOverlayClick
      onClose={handleOnClose}
      activator={
        <TextField
          role="combobox"
          label={label}
          prefix={<Icon source={CalendarIcon} />}
          onFocus={() => setVisible(true)}
          value={formattedValue}
          autoComplete="off"
        />
      }
    >
      <Card>
        <DatePicker
          month={month}
          year={year}
          disableDatesBefore={disableDatesBefore}
          selected={selectedDate}
          onMonthChange={handleMonthChange}
          onChange={handleDateChange}
        />
      </Card>
    </Popover>
  );
}

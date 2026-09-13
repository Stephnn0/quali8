import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  BlockStack,
  Button,
  Checkbox,
  InlineGrid,
  InlineStack,
  Tag,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  WEEKDAYS,
  isIsoDate,
  type DeliverySchedule,
  type MethodSchedule,
  type Weekday,
} from "app/services/delivery/deliverySchedule";

type Props = { schedule: DeliverySchedule };

type MethodDraft = {
  blockedWeekdays: Weekday[];
  blockedDates: string[];
  leadDays: string;
  maxDaysAhead: string;
  newDate: string;
  /** Same-day rules live in the Today delivery card; carried through untouched. */
  todayEnabled: boolean;
  todayCutoff: string | null;
};

const toDraft = (m: MethodSchedule): MethodDraft => ({
  blockedWeekdays: m.blockedWeekdays,
  blockedDates: m.blockedDates,
  leadDays: String(m.leadDays),
  maxDaysAhead: String(m.maxDaysAhead),
  newDate: "",
  todayEnabled: m.todayEnabled,
  todayCutoff: m.todayCutoff,
});

const fromDraft = (d: MethodDraft): MethodSchedule => ({
  blockedWeekdays: d.blockedWeekdays,
  blockedDates: d.blockedDates,
  leadDays: Math.max(0, Number.parseInt(d.leadDays, 10) || 0),
  maxDaysAhead: Math.max(0, Number.parseInt(d.maxDaysAhead, 10) || 0),
  todayEnabled: d.todayEnabled,
  todayCutoff: d.todayCutoff,
});

const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

/** One column of rules: weekdays, blocked dates, lead time, window. */
function MethodRules({
  title,
  hint,
  draft,
  onChange,
}: {
  title: string;
  hint: string;
  draft: MethodDraft;
  onChange: (next: MethodDraft) => void;
}) {
  const toggleWeekday = (day: Weekday, checked: boolean) =>
    onChange({
      ...draft,
      blockedWeekdays: checked
        ? Array.from(new Set([...draft.blockedWeekdays, day])).sort()
        : draft.blockedWeekdays.filter((d) => d !== day),
    });

  const addDate = () => {
    const value = draft.newDate.trim();
    if (!isIsoDate(value) || draft.blockedDates.includes(value)) return;
    onChange({ ...draft, blockedDates: [...draft.blockedDates, value].sort(), newDate: "" });
  };

  return (
    <BlockStack gap="300">
      <BlockStack gap="100">
        <Text as="h3" variant="headingSm">
          {title}
        </Text>
        <Text as="p" tone="subdued" variant="bodySm">
          {hint}
        </Text>
      </BlockStack>
      <BlockStack gap="100">
        <Text as="p" variant="bodySm" fontWeight="semibold">
          Closed on
        </Text>
        <InlineStack gap="300" wrap>
          {WEEKDAYS.map((day) => (
            <Checkbox
              key={day.value}
              label={day.short}
              checked={draft.blockedWeekdays.includes(day.value)}
              onChange={(checked) => toggleWeekday(day.value, checked)}
            />
          ))}
        </InlineStack>
      </BlockStack>
      <BlockStack gap="200">
        <InlineStack gap="200" blockAlign="end">
          <div style={{ flex: 1 }}>
            <TextField
              label="Block a date"
              type="date"
              autoComplete="off"
              value={draft.newDate}
              onChange={(value) => onChange({ ...draft, newDate: value })}
              helpText="Holidays, closures, sold-out days."
            />
          </div>
          <Button onClick={addDate} disabled={!isIsoDate(draft.newDate.trim())}>
            Add
          </Button>
        </InlineStack>
        {draft.blockedDates.length ? (
          <InlineStack gap="200" wrap>
            {draft.blockedDates.map((date) => (
              <Tag
                key={date}
                onRemove={() =>
                  onChange({ ...draft, blockedDates: draft.blockedDates.filter((d) => d !== date) })
                }
              >
                {prettyDate(date)}
              </Tag>
            ))}
          </InlineStack>
        ) : (
          <Text as="p" tone="subdued" variant="bodySm">
            No dates blocked.
          </Text>
        )}
      </BlockStack>
      <InlineGrid columns={2} gap="300">
        <TextField
          label="Earliest, days from today"
          type="number"
          min={0}
          max={60}
          autoComplete="off"
          value={draft.leadDays}
          onChange={(value) => onChange({ ...draft, leadDays: value })}
          helpText="0 offers same-day."
        />
        <TextField
          label="Latest, days from today"
          type="number"
          min={0}
          max={365}
          autoComplete="off"
          value={draft.maxDaysAhead}
          onChange={(value) => onChange({ ...draft, maxDaysAhead: value })}
        />
      </InlineGrid>
    </BlockStack>
  );
}

/**
 * Delivery / pickup calendar rules for the cart block. Posts
 * `save-schedule` to the Delivery page's action.
 */
export default function DeliveryScheduleEditor({ schedule }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();
  const saving = fetcher.state !== "idle";

  const [enabled, setEnabled] = useState(schedule.enabled);
  const [requireDate, setRequireDate] = useState(schedule.requireDate);
  const [delivery, setDelivery] = useState<MethodDraft>(() => toDraft(schedule.delivery));
  const [pickup, setPickup] = useState<MethodDraft>(() => toDraft(schedule.pickup));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.code === "schedule-saved") {
      shopify.toast.show("Calendar saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () =>
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-schedule",
          enabled,
          requireDate,
          delivery: fromDraft(delivery),
          pickup: fromDraft(pickup),
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );

  return (
    <BlockStack gap="400">
      <Checkbox
        label="Show a date calendar in the cart"
        checked={enabled}
        onChange={setEnabled}
        helpText="Shoppers pick a delivery date, or a pickup date, on the Delivery / Pickup step. The date is saved on the order."
      />
      <Checkbox
        label="Require a date before checkout"
        checked={requireDate}
        onChange={setRequireDate}
        disabled={!enabled}
      />
      <InlineGrid columns={{ xs: 1, md: 2 }} gap="600">
        <MethodRules
          title="Delivery days"
          hint="Days you do not deliver. Sundays off? Block Sunday."
          draft={delivery}
          onChange={setDelivery}
        />
        <MethodRules
          title="Pickup days"
          hint="Days the shop is closed for pickup."
          draft={pickup}
          onChange={setPickup}
        />
      </InlineGrid>
      <InlineStack>
        <Button variant="primary" onClick={save} loading={saving}>
          Save calendar
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

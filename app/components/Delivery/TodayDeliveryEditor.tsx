import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Checkbox,
  InlineGrid,
  InlineStack,
  Select,
  Text,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { todayStatus, type MethodSchedule } from "app/services/delivery/deliverySchedule";
import { formatTime12, type ShopClock } from "app/services/delivery/shopTime";

type Props = {
  clock: (ShopClock & { known: boolean }) | null;
  delivery: MethodSchedule;
  pickup: MethodSchedule;
};

type Draft = { enabled: boolean; cutoff: string };

const NO_CUTOFF = "";

/** Half-hour steps, 6:00 AM to 10:00 PM. */
const CUTOFF_OPTIONS = [
  { label: "No cutoff (all day)", value: NO_CUTOFF },
  ...Array.from({ length: 33 }, (_, i) => {
    const minutes = 6 * 60 + i * 30;
    const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return { label: formatTime12(value), value };
  }),
];

const toDraft = (m: MethodSchedule): Draft => ({ enabled: m.todayEnabled, cutoff: m.todayCutoff ?? NO_CUTOFF });

function MethodRule({
  title,
  draft,
  onChange,
  status,
}: {
  title: string;
  draft: Draft;
  onChange: (next: Draft) => void;
  status: "open" | "closed" | "off";
}) {
  const badge =
    status === "open" ? (
      <Badge tone="success">Open now</Badge>
    ) : status === "closed" ? (
      <Badge tone="attention">Closed for today</Badge>
    ) : (
      <Badge>Off</Badge>
    );
  return (
    <BlockStack gap="300">
      <InlineStack gap="200" blockAlign="center">
        <Text as="h3" variant="headingSm">
          {title}
        </Text>
        {badge}
      </InlineStack>
      <Checkbox
        label="Offer same-day"
        checked={draft.enabled}
        onChange={(enabled) => onChange({ ...draft, enabled })}
        helpText="Also needs “Earliest, days from today” set to 0 in the calendar."
      />
      <Select
        label="Closes at"
        options={CUTOFF_OPTIONS}
        value={draft.cutoff}
        onChange={(cutoff) => onChange({ ...draft, cutoff })}
        disabled={!draft.enabled}
        helpText="Orders placed after this shop time can't pick today."
      />
    </BlockStack>
  );
}

/**
 * Same-day rules per method, judged on the shop's clock. Posts
 * `save-today-rules` to the Delivery page's action.
 */
export default function TodayDeliveryEditor({ clock, delivery, pickup }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();
  const saving = fetcher.state !== "idle";

  const [deliveryDraft, setDeliveryDraft] = useState<Draft>(() => toDraft(delivery));
  const [pickupDraft, setPickupDraft] = useState<Draft>(() => toDraft(pickup));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.code === "today-rules-saved") {
      shopify.toast.show("Today delivery saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const preview = (draft: Draft) =>
    todayStatus({ ...delivery, todayEnabled: draft.enabled, todayCutoff: draft.cutoff || null }, clock?.time ?? null);

  const save = () =>
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-today-rules",
          delivery: { enabled: deliveryDraft.enabled, cutoff: deliveryDraft.cutoff || null },
          pickup: { enabled: pickupDraft.enabled, cutoff: pickupDraft.cutoff || null },
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center" wrap>
        <Text as="p" variant="bodySm" fontWeight="semibold">
          Shop time zone
        </Text>
        {clock?.known ? (
          <Badge tone="info">{clock.timezone}</Badge>
        ) : (
          <Badge tone="warning">Unknown, using UTC</Badge>
        )}
        {clock ? (
          <Text as="p" variant="bodySm" tone="subdued">
            It is {formatTime12(clock.time)} there on {clock.date}. Read from your Shopify store settings.
          </Text>
        ) : null}
      </InlineStack>
      <InlineGrid columns={{ xs: 1, md: 2 }} gap="600">
        <MethodRule title="Delivery" draft={deliveryDraft} onChange={setDeliveryDraft} status={preview(deliveryDraft)} />
        <MethodRule title="Pickup" draft={pickupDraft} onChange={setPickupDraft} status={preview(pickupDraft)} />
      </InlineGrid>
      <InlineStack>
        <Button variant="primary" onClick={save} loading={saving}>
          Save today delivery
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

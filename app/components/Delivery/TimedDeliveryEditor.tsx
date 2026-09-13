import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  BlockStack,
  Button,
  Checkbox,
  InlineGrid,
  InlineStack,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  KIND_LABELS,
  MAX_TIME_WINDOWS,
  TIME_WINDOW_KINDS,
  windowLabel,
  type TimeWindowKind,
  type TimeWindowRow,
} from "app/services/delivery/timedDelivery";
import { isValidTime } from "app/services/delivery/shopTime";

type Props = { windows: TimeWindowRow[] };

type Draft = { key: number; kind: TimeWindowKind; time: string; price: string; active: boolean };

const KIND_OPTIONS = TIME_WINDOW_KINDS.map((kind) => ({ label: KIND_LABELS[kind], value: kind }));

let nextKey = 1;
const toDraft = (w: TimeWindowRow): Draft => ({ key: nextKey++, kind: w.kind, time: w.time, price: String(w.price), active: w.active });
const blankDraft = (): Draft => ({ key: nextKey++, kind: "before", time: "12:00", price: "", active: true });

const draftValid = (d: Draft) => isValidTime(d.time) && (d.price.trim() === "" || Number.isFinite(Number.parseFloat(d.price)));

/**
 * The timed delivery windows and their surcharges. Saves the whole list
 * with `save-time-windows` on the Delivery page's action.
 */
export default function TimedDeliveryEditor({ windows }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();
  const saving = fetcher.state !== "idle";

  const [drafts, setDrafts] = useState<Draft[]>(() => windows.map(toDraft));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.code === "time-windows-saved") {
      shopify.toast.show("Timed delivery saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const update = (key: number, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const remove = (key: number) => setDrafts((list) => list.filter((d) => d.key !== key));
  const add = () => setDrafts((list) => (list.length >= MAX_TIME_WINDOWS ? list : [...list, blankDraft()]));

  const codes = drafts.map((d) => `${d.kind}:${d.time}`);
  const duplicate = (i: number) => codes.indexOf(codes[i]) !== i;
  const allValid = drafts.every(draftValid) && !drafts.some((_, i) => duplicate(i));

  const save = () =>
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-time-windows",
          windows: drafts.map((d) => ({
            kind: d.kind,
            time: d.time,
            price: d.price.trim() === "" ? 0 : Math.max(0, Number.parseFloat(d.price) || 0),
            active: d.active,
          })),
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );

  return (
    <BlockStack gap="400">
      {drafts.length ? (
        <BlockStack gap="300">
          {drafts.map((d, i) => (
            <InlineGrid key={d.key} columns={{ xs: 1, md: "1fr 1fr 1fr auto auto" }} gap="300" alignItems="end">
              <Select label="Window" options={KIND_OPTIONS} value={d.kind} onChange={(kind) => update(d.key, { kind: kind as TimeWindowKind })} />
              <TextField
                label="Time"
                type="time"
                autoComplete="off"
                value={d.time}
                onChange={(time) => update(d.key, { time })}
                error={!isValidTime(d.time) ? "Pick a time" : duplicate(i) ? "Same as another window" : undefined}
              />
              <TextField
                label="Extra charge"
                type="number"
                min={0}
                step={0.5}
                prefix="$"
                autoComplete="off"
                value={d.price}
                onChange={(price) => update(d.key, { price })}
                placeholder="0"
              />
              <Checkbox label="Active" checked={d.active} onChange={(active) => update(d.key, { active })} />
              <Button icon={DeleteIcon} accessibilityLabel={`Remove ${windowLabel(d)}`} onClick={() => remove(d.key)} tone="critical" variant="tertiary" />
            </InlineGrid>
          ))}
        </BlockStack>
      ) : (
        <Text as="p" tone="subdued" variant="bodySm">
          No timed windows yet. Shoppers see a plain delivery until you add one.
        </Text>
      )}
      <InlineStack gap="300">
        <Button icon={PlusIcon} onClick={add} disabled={drafts.length >= MAX_TIME_WINDOWS}>
          Add window
        </Button>
        <Button variant="primary" onClick={save} loading={saving} disabled={!allValid}>
          Save timed delivery
        </Button>
      </InlineStack>
      {drafts.length ? (
        <Text as="p" tone="subdued" variant="bodySm">
          Shoppers see: {drafts.filter(draftValid).map((d) => `${windowLabel(d)}${Number.parseFloat(d.price) > 0 ? ` (+$${Number.parseFloat(d.price).toFixed(2)})` : ""}`).join(" · ")}
        </Text>
      ) : null}
    </BlockStack>
  );
}

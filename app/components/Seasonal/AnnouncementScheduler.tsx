import { useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Checkbox,
  InlineGrid,
  InlineStack,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { scheduleWindow } from "./dates";

type Bar = {
  enabled: boolean;
  message: string;
  backgroundColor: string;
  textColor: string;
  startDate: string;
  endDate: string;
};

type Props = {
  /** When set, defaults anchor to this sales date; otherwise to today. */
  specialDateName?: string;
  specialDateDate?: string;
  announcementBar: Bar | null;
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <InlineStack gap="200" blockAlign="center" wrap={false}>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          style={{
            width: "2.25rem",
            height: "2.25rem",
            padding: 0,
            border: "1px solid #d0d0d0",
            borderRadius: "8px",
            background: "transparent",
            cursor: "pointer",
          }}
        />
        <div style={{ width: "6.5rem" }}>
          <TextField
            label={label}
            labelHidden
            autoComplete="off"
            value={value}
            onChange={(next) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(next)) onChange(next);
            }}
          />
        </div>
      </InlineStack>
    </BlockStack>
  );
}

/**
 * Schedules the homepage announcement bar for this special date. The theme
 * block shows it only while today is inside the window.
 */
export default function AnnouncementScheduler({
  specialDateName,
  specialDateDate,
  announcementBar,
}: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const saving = fetcher.state !== "idle";

  const [enabled, setEnabled] = useState(announcementBar?.enabled ?? true);
  const [message, setMessage] = useState(
    announcementBar?.message ??
      (specialDateName
        ? `Order in time for ${specialDateName}!`
        : "Free shipping on every order this week!"),
  );
  const [backgroundColor, setBackgroundColor] = useState(
    announcementBar?.backgroundColor ?? "#2c1f58",
  );
  const [textColor, setTextColor] = useState(
    announcementBar?.textColor ?? "#ffffff",
  );
  const [startDate, setStartDate] = useState(
    announcementBar?.startDate ?? scheduleWindow(specialDateDate).start,
  );
  const [endDate, setEndDate] = useState(
    announcementBar?.endDate ?? scheduleWindow(specialDateDate).end,
  );

  const validColors =
    /^#[0-9a-fA-F]{6}$/.test(backgroundColor) &&
    /^#[0-9a-fA-F]{6}$/.test(textColor);
  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
    startDate <= endDate;

  const save = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-announcement",
          enabled,
          message,
          backgroundColor,
          textColor,
          startDate,
          endDate,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Announcement bar saved");
  };

  const remove = () => {
    fetcher.submit(
      { body: JSON.stringify({ action: "remove-announcement" }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Announcement bar removed");
  };

  return (
    <BlockStack gap="400">
        <InlineStack gap="200" blockAlign="center">
          {announcementBar ? (
            <Badge tone={announcementBar.enabled ? "success" : undefined}>
              {announcementBar.enabled ? "Scheduled" : "Paused"}
            </Badge>
          ) : null}
          <Text as="p" tone="subdued" variant="bodySm">
            Shows on your home page only between the dates below. Add the
            &ldquo;Announcement bar&rdquo; block once in your theme editor —
            scheduling happens here.
          </Text>
        </InlineStack>

        {/* Live preview */}
        <div
          style={{
            background: backgroundColor,
            color: textColor,
            borderRadius: "8px",
            padding: "0.625rem 1rem",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {message || "Your announcement"}
        </div>

        <TextField
          label="Message"
          autoComplete="off"
          value={message}
          onChange={setMessage}
          maxLength={160}
          showCharacterCount
        />

        <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
          <ColorField
            label="Background"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />
          <ColorField label="Text" value={textColor} onChange={setTextColor} />
          <TextField
            label="Show from"
            type="date"
            autoComplete="off"
            value={startDate}
            onChange={setStartDate}
          />
          <TextField
            label="Until"
            type="date"
            autoComplete="off"
            value={endDate}
            onChange={setEndDate}
            error={
              validDates || !endDate ? undefined : "Must be after the start"
            }
          />
        </InlineGrid>

        <InlineStack gap="300" blockAlign="center">
          <Button
            variant="primary"
            onClick={save}
            loading={saving}
            disabled={!message.trim() || !validColors || !validDates || saving}
          >
            {announcementBar ? "Save changes" : "Schedule bar"}
          </Button>
          <Checkbox label="Enabled" checked={enabled} onChange={setEnabled} />
          {announcementBar ? (
            <Button variant="tertiary" tone="critical" onClick={remove}>
              Remove
            </Button>
          ) : null}
        </InlineStack>
    </BlockStack>
  );
}

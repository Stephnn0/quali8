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
import { ImageIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import FilesPickerModal from "./FilesPickerModal";

export type HeroConfig = {
  enabled: boolean;
  imageUrl: string;
  heading: string;
  description: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  startDate: string;
  endDate: string;
};

type Props = {
  specialDateName: string;
  specialDateDate: string;
  hero: HeroConfig | null;
};

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function defaultStart(dateIso: string): string {
  const date = new Date(dateIso + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - 14);
  return isoDay(date);
}

type PickedProduct = {
  images?: Array<{ originalSrc?: string; src?: string }>;
};

/** Schedules a homepage hero section for this special date. */
export default function HeroScheduler({
  specialDateName,
  specialDateDate,
  hero,
}: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const saving = fetcher.state !== "idle";
  const [filesOpen, setFilesOpen] = useState(false);

  const [enabled, setEnabled] = useState(hero?.enabled ?? true);
  const [imageUrl, setImageUrl] = useState(hero?.imageUrl ?? "");
  const [heading, setHeading] = useState(
    hero?.heading ?? `${specialDateName} is coming`,
  );
  const [description, setDescription] = useState(hero?.description ?? "");
  const [buttonLabel, setButtonLabel] = useState(hero?.buttonLabel ?? "");
  const [buttonUrl, setButtonUrl] = useState(hero?.buttonUrl ?? "");
  const [startDate, setStartDate] = useState(
    hero?.startDate ?? defaultStart(specialDateDate),
  );
  const [endDate, setEndDate] = useState(hero?.endDate ?? specialDateDate);

  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
    startDate <= endDate;
  const validImage = /^https:\/\//.test(imageUrl);
  const buttonComplete =
    (!buttonLabel.trim() && !buttonUrl.trim()) ||
    (buttonLabel.trim().length > 0 && buttonUrl.trim().length > 0);

  const pickImage = async () => {
    const selected = (await shopify.resourcePicker({
      type: "product",
      multiple: false,
    })) as PickedProduct[] | undefined;
    const image = selected?.[0]?.images?.[0];
    const url = image?.originalSrc || image?.src;
    if (url) setImageUrl(url);
  };

  const save = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-hero",
          enabled,
          imageUrl,
          heading,
          description: description || undefined,
          buttonLabel: buttonLabel.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          startDate,
          endDate,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Hero section saved");
  };

  const remove = () => {
    fetcher.submit(
      { body: JSON.stringify({ action: "remove-hero" }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Hero section removed");
  };

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center">
        {hero ? (
          <Badge tone={hero.enabled ? "success" : undefined}>
            {hero.enabled ? "Scheduled" : "Paused"}
          </Badge>
        ) : null}
        <Text as="p" tone="subdued" variant="bodySm">
          A full-width hero on your home page during the window below. Add
          the &ldquo;Scheduled hero&rdquo; block once in your theme editor.
        </Text>
      </InlineStack>

      {/* Live preview */}
      <div
        style={{
          borderRadius: "10px",
          overflow: "hidden",
          position: "relative",
          minHeight: "11rem",
          display: "flex",
          alignItems: "center",
          background: validImage
            ? `linear-gradient(rgba(20,14,40,.45), rgba(20,14,40,.45)), url(${imageUrl}) center/cover`
            : "linear-gradient(135deg, #2c1f58, #1d1539)",
          color: "#fff",
          padding: "1.5rem 2rem",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <p style={{ margin: 0, fontSize: "1.375rem", fontWeight: 650 }}>
            {heading || "Your headline"}
          </p>
          {description ? (
            <p style={{ margin: "0.375rem 0 0", fontSize: ".875rem", opacity: 0.9 }}>
              {description}
            </p>
          ) : null}
          {buttonLabel.trim() ? (
            <span
              style={{
                display: "inline-block",
                marginTop: "0.75rem",
                background: "#fff",
                color: "#1a1a1a",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontSize: ".8125rem",
                fontWeight: 600,
              }}
            >
              {buttonLabel}
            </span>
          ) : null}
        </div>
      </div>

      <InlineStack gap="200" blockAlign="end" wrap={false}>
        <div style={{ flex: 1 }}>
          <TextField
            label="Image URL"
            autoComplete="off"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="https://cdn.shopify.com/…"
            helpText="Paste an image URL, or pick a product to use its photo"
          />
        </div>
        <Button icon={ImageIcon} onClick={pickImage}>
          From a product
        </Button>
        <Button icon={ImageIcon} onClick={() => setFilesOpen(true)}>
          From your files
        </Button>
      </InlineStack>

      <FilesPickerModal
        open={filesOpen}
        onClose={() => setFilesOpen(false)}
        onSelect={setImageUrl}
      />

      <TextField
        label="Headline"
        autoComplete="off"
        value={heading}
        onChange={setHeading}
        maxLength={80}
        showCharacterCount
      />
      <TextField
        label="Description (optional)"
        autoComplete="off"
        multiline={2}
        value={description}
        onChange={setDescription}
        maxLength={200}
      />

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <TextField
          label="Button label (optional)"
          autoComplete="off"
          value={buttonLabel}
          onChange={setButtonLabel}
          maxLength={40}
        />
        <TextField
          label="Button link"
          autoComplete="off"
          value={buttonUrl}
          onChange={setButtonUrl}
          placeholder="/collections/valentines-day"
          disabled={!buttonLabel.trim()}
          error={buttonComplete ? undefined : "Add a link for the button"}
        />
      </InlineGrid>

      <InlineGrid columns={{ xs: 2 }} gap="400">
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
          error={validDates || !endDate ? undefined : "Must be after the start"}
        />
      </InlineGrid>

      <InlineStack gap="300" blockAlign="center">
        <Button
          variant="primary"
          onClick={save}
          loading={saving}
          disabled={
            !heading.trim() || !validImage || !validDates || !buttonComplete || saving
          }
        >
          {hero ? "Save changes" : "Schedule hero"}
        </Button>
        <Checkbox label="Enabled" checked={enabled} onChange={setEnabled} />
        {hero ? (
          <Button variant="tertiary" tone="critical" onClick={remove}>
            Remove
          </Button>
        ) : null}
      </InlineStack>
    </BlockStack>
  );
}

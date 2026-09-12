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
import { scheduleWindow } from "./dates";

export type PopupConfig = {
  enabled: boolean;
  imageUrl: string;
  heading: string;
  description: string;
  discountCode: string;
  startDate: string;
  endDate: string;
};

type Props = {
  /** When set, defaults anchor to this sales date; otherwise to today. */
  specialDateName?: string;
  specialDateDate?: string;
  popup: PopupConfig | null;
};

type PickedProduct = {
  images?: Array<{ originalSrc?: string; src?: string }>;
};

/** Schedules the first-time-subscriber popup for this special date. */
export default function PopupScheduler({
  specialDateName,
  specialDateDate,
  popup,
}: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const saving = fetcher.state !== "idle";
  const [filesOpen, setFilesOpen] = useState(false);

  const [enabled, setEnabled] = useState(popup?.enabled ?? true);
  const [imageUrl, setImageUrl] = useState(popup?.imageUrl ?? "");
  const [heading, setHeading] = useState(
    popup?.heading ??
      (specialDateName ? `Get ready for ${specialDateName}` : "Join the list"),
  );
  const [description, setDescription] = useState(
    popup?.description ??
      "Subscribe and get a discount code for your first order.",
  );
  const [discountCode, setDiscountCode] = useState(popup?.discountCode ?? "");
  const [startDate, setStartDate] = useState(
    popup?.startDate ?? scheduleWindow(specialDateDate).start,
  );
  const [endDate, setEndDate] = useState(popup?.endDate ?? scheduleWindow(specialDateDate).end);

  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
    startDate <= endDate;
  const validImage = /^https:\/\//.test(imageUrl);

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
          action: "save-popup",
          enabled,
          imageUrl,
          heading,
          description,
          discountCode: discountCode.trim(),
          startDate,
          endDate,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Subscribe popup saved");
  };

  const remove = () => {
    fetcher.submit(
      { body: JSON.stringify({ action: "remove-popup" }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Subscribe popup removed");
  };

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center">
        {popup ? (
          <Badge tone={popup.enabled ? "success" : undefined}>
            {popup.enabled ? "Scheduled" : "Paused"}
          </Badge>
        ) : null}
        <Text as="p" tone="subdued" variant="bodySm">
          Shown once to first-time visitors on your home page during the
          window. Subscribers get the discount code; shoppers already
          subscribed never see it. Add the &ldquo;Subscribe popup&rdquo;
          block once in your theme editor.
        </Text>
      </InlineStack>

      {/* Live preview: image left, content right */}
      <div
        style={{
          display: "flex",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1px solid #e5e5e5",
          maxWidth: "30rem",
        }}
      >
        <div
          style={{
            flex: "0 0 40%",
            minHeight: "12rem",
            background: validImage
              ? `url(${imageUrl}) center/cover`
              : "linear-gradient(135deg, #2c1f58, #5c3d99)",
          }}
        />
        <div style={{ flex: 1, padding: "1rem 1.25rem" }}>
          <p style={{ margin: 0, fontWeight: 650, fontSize: "1rem" }}>
            {heading || "Your headline"}
          </p>
          <p style={{ margin: "0.375rem 0 0.75rem", fontSize: ".8125rem", color: "#555" }}>
            {description || "Your description"}
          </p>
          <div
            style={{
              border: "1px solid #d0d0d0",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              fontSize: ".8125rem",
              color: "#8a8a8a",
              marginBottom: "0.5rem",
            }}
          >
            Email address
          </div>
          <div
            style={{
              background: "#5c3d99",
              color: "#fff",
              borderRadius: "8px",
              padding: "0.5rem",
              textAlign: "center",
              fontSize: ".8125rem",
              fontWeight: 600,
            }}
          >
            Subscribe
          </div>
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
        label="Description"
        autoComplete="off"
        multiline={2}
        value={description}
        onChange={setDescription}
        maxLength={220}
      />
      <TextField
        label="Discount code to reveal after subscribing"
        autoComplete="off"
        value={discountCode}
        onChange={setDiscountCode}
        placeholder="e.g. WELCOME10"
        helpText="Create the code first (a shipping promotion here, or any Shopify discount)"
      />

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
            !heading.trim() ||
            !description.trim() ||
            !discountCode.trim() ||
            !validImage ||
            !validDates ||
            saving
          }
        >
          {popup ? "Save changes" : "Schedule popup"}
        </Button>
        <Checkbox label="Enabled" checked={enabled} onChange={setEnabled} />
        {popup ? (
          <Button variant="tertiary" tone="critical" onClick={remove}>
            Remove
          </Button>
        ) : null}
      </InlineStack>
    </BlockStack>
  );
}

import { useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Checkbox,
  InlineGrid,
  InlineStack,
  RangeSlider,
  Text,
  TextField,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import FilesPickerModal from "./FilesPickerModal";
import { scheduleWindow } from "./dates";

export type HeroConfig = {
  enabled: boolean;
  imageUrl: string;
  imageUrl2: string | null;
  imageUrl3: string | null;
  heading: string;
  description: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  heightPx: number;
  textColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  overlayOpacity: number;
  startDate: string;
  endDate: string;
};

type Props = {
  /** When set, defaults anchor to this sales date; otherwise to today. */
  specialDateName?: string;
  specialDateDate?: string;
  hero: HeroConfig | null;
};

type PickedProduct = {
  images?: Array<{ originalSrc?: string; src?: string }>;
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

/** Schedules the homepage hero slider (up to 3 images) for this date. */
export default function HeroScheduler({
  specialDateName,
  specialDateDate,
  hero,
}: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const saving = fetcher.state !== "idle";

  const [enabled, setEnabled] = useState(hero?.enabled ?? true);
  const [images, setImages] = useState<string[]>([
    hero?.imageUrl ?? "",
    hero?.imageUrl2 ?? "",
    hero?.imageUrl3 ?? "",
  ]);
  const [filesOpenFor, setFilesOpenFor] = useState<number | null>(null);
  const [heading, setHeading] = useState(
    hero?.heading ??
      (specialDateName ? `${specialDateName} is coming` : "New season, new arrivals"),
  );
  const [description, setDescription] = useState(hero?.description ?? "");
  const [buttonLabel, setButtonLabel] = useState(hero?.buttonLabel ?? "");
  const [buttonUrl, setButtonUrl] = useState(hero?.buttonUrl ?? "");
  const [heightPx, setHeightPx] = useState(hero?.heightPx ?? 480);
  const [textColor, setTextColor] = useState(hero?.textColor ?? "#ffffff");
  const [buttonBackground, setButtonBackground] = useState(
    hero?.buttonBackground ?? "#ffffff",
  );
  const [buttonTextColor, setButtonTextColor] = useState(
    hero?.buttonTextColor ?? "#1a1a1a",
  );
  const [overlayOpacity, setOverlayOpacity] = useState(
    hero?.overlayOpacity ?? 35,
  );
  const [startDate, setStartDate] = useState(
    hero?.startDate ?? scheduleWindow(specialDateDate).start,
  );
  const [endDate, setEndDate] = useState(hero?.endDate ?? scheduleWindow(specialDateDate).end);

  const setImage = (index: number, url: string) =>
    setImages((current) =>
      current.map((entry, i) => (i === index ? url : entry)),
    );

  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
    startDate <= endDate;
  const validImage = /^https:\/\//.test(images[0]);
  const buttonComplete =
    (!buttonLabel.trim() && !buttonUrl.trim()) ||
    (buttonLabel.trim().length > 0 && buttonUrl.trim().length > 0);

  const pickProductImage = async (index: number) => {
    const selected = (await shopify.resourcePicker({
      type: "product",
      multiple: false,
    })) as PickedProduct[] | undefined;
    const image = selected?.[0]?.images?.[0];
    const url = image?.originalSrc || image?.src;
    if (url) setImage(index, url);
  };

  const save = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-hero",
          enabled,
          imageUrl: images[0],
          imageUrl2: /^https:\/\//.test(images[1]) ? images[1] : undefined,
          imageUrl3: /^https:\/\//.test(images[2]) ? images[2] : undefined,
          heading,
          description: description || undefined,
          buttonLabel: buttonLabel.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          heightPx,
          textColor,
          buttonBackground,
          buttonTextColor,
          overlayOpacity,
          startDate,
          endDate,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Hero saved");
  };

  const remove = () => {
    fetcher.submit(
      { body: JSON.stringify({ action: "remove-hero" }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Hero removed");
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
          A full-width hero (or slider with up to 3 images) on your home page
          during the window. Add the &ldquo;Scheduled hero&rdquo; block once
          in your theme editor.
        </Text>
      </InlineStack>

      {/* Live preview */}
      <div
        style={{
          borderRadius: "10px",
          overflow: "hidden",
          position: "relative",
          height: `${Math.round(heightPx * 0.45)}px`,
          minHeight: "9rem",
          display: "flex",
          alignItems: "center",
          background: validImage
            ? `linear-gradient(100deg, rgba(10,8,24,${(overlayOpacity + 15) / 100}), rgba(10,8,24,${Math.max(0, overlayOpacity - 20) / 100})), url("${images[0].replace(/"/g, "%22")}") center/cover`
            : "linear-gradient(135deg, #2c1f58, #1d1539)",
          color: textColor,
          padding: "1.25rem 1.75rem",
        }}
      >
        <div style={{ maxWidth: "24rem" }}>
          <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
            {heading || "Your headline"}
          </p>
          {description ? (
            <p
              style={{
                margin: "0.25rem 0 0",
                fontSize: ".8125rem",
                opacity: 0.92,
              }}
            >
              {description}
            </p>
          ) : null}
          {buttonLabel.trim() ? (
            <span
              style={{
                display: "inline-block",
                marginTop: "0.625rem",
                background: buttonBackground,
                color: buttonTextColor,
                borderRadius: "999px",
                padding: "0.4375rem 1rem",
                fontSize: ".75rem",
                fontWeight: 600,
              }}
            >
              {buttonLabel}
            </span>
          ) : null}
        </div>
      </div>

      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          Images ({images.filter((url) => url).length}/3 — more than one
          becomes a slider)
        </Text>
        {images.map((url, index) => (
          <InlineStack key={index} gap="200" blockAlign="end" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label={
                  index === 0
                    ? "Image 1 (required)"
                    : `Image ${index + 1} (optional)`
                }
                autoComplete="off"
                value={url}
                onChange={(next) => setImage(index, next)}
                placeholder="https://cdn.shopify.com/…"
              />
            </div>
            <Button icon={ImageIcon} onClick={() => pickProductImage(index)}>
              Product
            </Button>
            <Button icon={ImageIcon} onClick={() => setFilesOpenFor(index)}>
              Files
            </Button>
          </InlineStack>
        ))}
      </BlockStack>

      <FilesPickerModal
        open={filesOpenFor !== null}
        onClose={() => setFilesOpenFor(null)}
        onSelect={(url) => {
          if (filesOpenFor !== null) setImage(filesOpenFor, url);
        }}
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

      <InlineGrid columns={{ xs: 2, sm: 3 }} gap="400">
        <ColorField
          label="Text color"
          value={textColor}
          onChange={setTextColor}
        />
        <ColorField
          label="Button color"
          value={buttonBackground}
          onChange={setButtonBackground}
        />
        <ColorField
          label="Button text"
          value={buttonTextColor}
          onChange={setButtonTextColor}
        />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <RangeSlider
          label={`Height: ${heightPx}px`}
          min={200}
          max={900}
          step={20}
          value={heightPx}
          onChange={(value) =>
            setHeightPx(typeof value === "number" ? value : value[0])
          }
          output
        />
        <RangeSlider
          label={`Image overlay: ${overlayOpacity}%`}
          min={0}
          max={80}
          step={5}
          value={overlayOpacity}
          onChange={(value) =>
            setOverlayOpacity(typeof value === "number" ? value : value[0])
          }
          helpText="Darkens the image so text stays readable — 0 shows it untouched"
          output
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
            !heading.trim() ||
            !validImage ||
            !validDates ||
            !buttonComplete ||
            saving
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

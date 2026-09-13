import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  BlockStack,
  Button,
  Checkbox,
  InlineGrid,
  InlineStack,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  MAX_GIFTS,
  MAX_SUGGESTED,
  MAX_TEXT,
  MIN_GIFTS,
  defaultOccasionBlockSettings,
  type OccasionBlockSettings,
} from "app/services/occasions/occasionBlock";

type Props = { settings: OccasionBlockSettings };

/**
 * Copy and behaviour of the Occasions + Gifts product-page block. Posts
 * `save-block-settings` to the Occasions page's action.
 */
export default function OccasionBlockSettingsEditor({ settings }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();
  const saving = fetcher.state !== "idle";
  const defaults = defaultOccasionBlockSettings();

  const [draft, setDraft] = useState<OccasionBlockSettings>(settings);
  const patch = (next: Partial<OccasionBlockSettings>) => setDraft((d) => ({ ...d, ...next }));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.code === "block-settings-saved") {
      shopify.toast.show("Product page block saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () =>
    fetcher.submit(
      { body: JSON.stringify({ action: "save-block-settings", ...draft }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  const text = (key: keyof OccasionBlockSettings, label: string, helpText?: string) => (
    <TextField
      label={label}
      autoComplete="off"
      value={String(draft[key])}
      onChange={(value) => patch({ [key]: value } as Partial<OccasionBlockSettings>)}
      placeholder={String(defaults[key])}
      maxLength={MAX_TEXT}
      helpText={helpText}
    />
  );

  return (
    <BlockStack gap="500">
      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          1. The question
        </Text>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {text("heading", "Heading")}
          {text("subheading", "Subheading")}
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <RangeSlider
            label={`Occasions suggested first: ${draft.suggestedCount}`}
            min={1}
            max={MAX_SUGGESTED}
            value={draft.suggestedCount}
            onChange={(value) => patch({ suggestedCount: Array.isArray(value) ? value[0] : value })}
            helpText="In-season occasions come first, then your order. The rest sit behind the “Other” chip."
          />
          {text("otherLabel", "“Other occasions” chip")}
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {text("pickerTitle", "Picker title", "Heading of the popup that lists every occasion.")}
          <BlockStack gap="200">
            <Checkbox
              label="Mark in-season occasions"
              checked={draft.showNowBadge}
              onChange={(showNowBadge) => patch({ showNowBadge })}
            />
            {text("nowLabel", "In-season badge")}
          </BlockStack>
        </InlineGrid>
      </BlockStack>

      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          2. The gifts
        </Text>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {text("giftsHeading", "Gifts heading", "Use {occasion} for the occasion's name.")}
          {text("giftsSubtext", "Gifts subtext")}
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <RangeSlider
            label={`Gifts shown: ${draft.giftLimit}`}
            min={MIN_GIFTS}
            max={MAX_GIFTS}
            value={draft.giftLimit}
            onChange={(value) => patch({ giftLimit: Array.isArray(value) ? value[0] : value })}
            helpText="Hand-picked products first, then connected collections and tagged products."
          />
          {text("changeLabel", "“Change occasion” link")}
        </InlineGrid>
        {text("emptyText", "Text when an occasion has no gifts yet")}
      </BlockStack>

      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          3. Add to cart
        </Text>
        <Checkbox
          label="Add the product being viewed together with the gift"
          checked={draft.pairWithProduct}
          onChange={(pairWithProduct) => patch({ pairWithProduct })}
          helpText="One tap puts both in the cart — the upsell. Off: the button adds only the gift."
        />
        <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
          {text("addLabel", "Button")}
          {text("addingLabel", "While adding")}
          {text("addedLabel", "After adding")}
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <Select
            label="After adding"
            options={[
              { label: "Stay on the page", value: "stay" },
              { label: "Go to the cart", value: "cart" },
            ]}
            value={draft.afterAdd}
            onChange={(afterAdd) => patch({ afterAdd: afterAdd === "cart" ? "cart" : "stay" })}
          />
          <Checkbox
            label="Remember the shopper's occasion"
            checked={draft.rememberChoice}
            onChange={(rememberChoice) => patch({ rememberChoice })}
            helpText="Keeps it across product pages and pre-fills the occasion on the cart's Options step."
          />
        </InlineGrid>
      </BlockStack>

      <InlineStack>
        <Button variant="primary" onClick={save} loading={saving}>
          Save product page block
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

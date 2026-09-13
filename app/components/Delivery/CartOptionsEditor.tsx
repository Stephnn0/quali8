import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { BlockStack, Button, Checkbox, InlineGrid, InlineStack, TextField } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { DEFAULT_NOTES_LABEL, MAX_NOTES_LABEL, type CartOptions } from "app/services/delivery/cartOptions";

type Props = { options: CartOptions };

/**
 * Which fields the cart block's Options step shows. Posts
 * `save-cart-options` to the Delivery page's action.
 */
export default function CartOptionsEditor({ options }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();
  const saving = fetcher.state !== "idle";

  const [draft, setDraft] = useState<CartOptions>(options);
  const patch = (next: Partial<CartOptions>) => setDraft((d) => ({ ...d, ...next }));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.code === "cart-options-saved") {
      shopify.toast.show("Options step saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () =>
    fetcher.submit(
      { body: JSON.stringify({ action: "save-cart-options", ...draft, notesLabel: draft.notesLabel.trim() || DEFAULT_NOTES_LABEL }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  return (
    <BlockStack gap="400">
      <Checkbox
        label="Show the Options step"
        checked={draft.enabled}
        onChange={(enabled) => patch({ enabled })}
        helpText="Off: shoppers go from Delivery / Pickup straight to Review & Checkout."
      />
      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <BlockStack gap="300">
          <Checkbox
            label="Occasion"
            checked={draft.occasionEnabled}
            onChange={(occasionEnabled) => patch({ occasionEnabled })}
            disabled={!draft.enabled}
            helpText="Picking one shows that occasion's products with an Add button (from Occasions)."
          />
          <Checkbox
            label="Card message"
            checked={draft.cardMessageEnabled}
            onChange={(cardMessageEnabled) => patch({ cardMessageEnabled })}
            disabled={!draft.enabled}
          />
          <Checkbox
            label="If nobody answers the door"
            checked={draft.doorEnabled}
            onChange={(doorEnabled) => patch({ doorEnabled })}
            disabled={!draft.enabled}
            helpText="A dropdown: “Yes, it's okay to leave them” or “No, do not leave them”. Saved on the order."
          />
        </BlockStack>
        <BlockStack gap="300">
          <Checkbox
            label="Notes field"
            checked={draft.notesEnabled}
            onChange={(notesEnabled) => patch({ notesEnabled })}
            disabled={!draft.enabled}
            helpText="Also becomes the order note."
          />
          <TextField
            label="Notes field label"
            autoComplete="off"
            value={draft.notesLabel}
            onChange={(notesLabel) => patch({ notesLabel })}
            placeholder={DEFAULT_NOTES_LABEL}
            maxLength={MAX_NOTES_LABEL}
            disabled={!draft.enabled || !draft.notesEnabled}
            helpText="What shoppers see above the field, e.g. “Delivery instructions”."
          />
        </BlockStack>
      </InlineGrid>
      <InlineStack>
        <Button variant="primary" onClick={save} loading={saving}>
          Save options step
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

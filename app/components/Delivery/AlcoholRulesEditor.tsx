import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  Banner,
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
  MAX_ALCOHOL_COLLECTIONS,
  MAX_MESSAGE_LENGTH,
  MAX_MINIMUM_AGE,
  MIN_MINIMUM_AGE,
  type AlcoholCollection,
  type AlcoholRules,
} from "app/services/delivery/alcoholRules";
import type { AlcoholValidationStatus } from "app/services/delivery/alcoholValidation.server";
import { APP } from "app/constants/app.constants";

type Props = {
  rules: AlcoholRules;
  status: AlcoholValidationStatus;
  /** False on plans without the cart block: only the master switch stays live. */
  editable: boolean;
};

type Result = {
  code: string;
  status?: AlcoholValidationStatus;
  errors: Array<{ message: string }> | null;
};

type PickedCollection = { id: string; title: string };

/**
 * The "Alcohol rules" card: which collections count as alcohol and the
 * three rules the cart block and the checkout validation enforce. Saving
 * also installs / updates the Shopify validation; its state shows here.
 */
export default function AlcoholRulesEditor({ rules, status: initialStatus, editable }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<Result>();
  const saving = fetcher.state !== "idle";

  const [draft, setDraft] = useState<AlcoholRules>(rules);
  const [status, setStatus] = useState<AlcoholValidationStatus>(initialStatus);
  const patch = (next: Partial<AlcoholRules>) => setDraft((d) => ({ ...d, ...next }));

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.status) setStatus(fetcher.data.status);
    if (fetcher.data.code === "alcohol-rules-saved") shopify.toast.show("Alcohol rules saved");
  }, [fetcher.state, fetcher.data, shopify]);

  const post = (body: Record<string, unknown>) =>
    fetcher.submit({ body: JSON.stringify(body) }, { method: "POST", encType: "multipart/form-data" });

  const save = () => {
    if (!editable) {
      post({ action: "disable-alcohol-rules" });
      return;
    }
    post({
      action: "save-alcohol-rules",
      enabled: draft.enabled,
      collections: draft.collections,
      ageCheckEnabled: draft.ageCheckEnabled,
      minimumAge: draft.minimumAge,
      localOnlyEnabled: draft.localOnlyEnabled,
      notAloneEnabled: draft.notAloneEnabled,
      ageMessage: draft.ageMessage.trim(),
      localOnlyMessage: draft.localOnlyMessage.trim(),
      notAloneMessage: draft.notAloneMessage.trim(),
    });
  };

  const pickCollections = async () => {
    const selected = (await shopify.resourcePicker({
      type: "collection",
      multiple: MAX_ALCOHOL_COLLECTIONS,
      selectionIds: draft.collections.map((collection) => ({ id: collection.id })),
    })) as PickedCollection[] | undefined;
    if (!selected) return; // Merchant cancelled — keep the current selection.
    const collections: AlcoholCollection[] = selected
      .slice(0, MAX_ALCOHOL_COLLECTIONS)
      .map((collection) => ({ id: collection.id, title: collection.title }));
    patch({ collections });
  };

  const removeCollection = (id: string) =>
    patch({ collections: draft.collections.filter((collection) => collection.id !== id) });

  const ageNumber = Number(draft.minimumAge);
  const ageOk = Number.isInteger(ageNumber) && ageNumber >= MIN_MINIMUM_AGE && ageNumber <= MAX_MINIMUM_AGE;
  const disabled = !editable || saving;

  const statusView = describeStatus(status);
  const syncError =
    fetcher.state === "idle" && fetcher.data?.errors?.length ? fetcher.data.errors[0].message : null;

  return (
    <BlockStack gap="400">
      {!editable ? (
        <Banner
          tone="info"
          title="Alcohol rules are part of the Advance plan"
          action={{ content: "Upgrade to Advance", onAction: APP.OPEN_APP_PLANS_PAGE }}
        >
          <p>You can still switch enforcement off here.</p>
        </Banner>
      ) : null}

      <Checkbox
        label="Enforce alcohol rules"
        checked={draft.enabled}
        onChange={(enabled) => patch({ enabled })}
        disabled={saving}
        helpText="Applies to every product in the collections below, in the cart block and again at checkout."
      />

      {draft.enabled && draft.collections.length === 0 ? (
        <Banner tone="warning" title="Pick at least one collection">
          <p>The rules do nothing until you choose which collections contain alcohol.</p>
        </Banner>
      ) : null}

      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <Text as="h3" variant="headingSm">
            Alcohol products
          </Text>
          <Button onClick={pickCollections} disabled={disabled}>
            {draft.collections.length ? "Change collections" : "Select collections"}
          </Button>
        </InlineStack>
        {draft.collections.length ? (
          <InlineStack gap="200" wrap>
            {draft.collections.map((collection) => (
              <Tag key={collection.id} onRemove={disabled ? undefined : () => removeCollection(collection.id)}>
                {collection.title}
              </Tag>
            ))}
          </InlineStack>
        ) : (
          <Text as="p" tone="subdued" variant="bodySm">
            No collections selected. Every product in a selected collection counts as alcohol.
          </Text>
        )}
      </BlockStack>

      <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
        <BlockStack gap="300">
          <Checkbox
            label="Age check"
            checked={draft.ageCheckEnabled}
            onChange={(ageCheckEnabled) => patch({ ageCheckEnabled })}
            disabled={disabled}
            helpText="Shoppers enter their date of birth and confirm they are of legal age. Both are saved on the order."
          />
          <TextField
            label="Minimum age"
            type="number"
            min={MIN_MINIMUM_AGE}
            max={MAX_MINIMUM_AGE}
            autoComplete="off"
            value={String(draft.minimumAge)}
            onChange={(value) => patch({ minimumAge: Number(value) })}
            disabled={disabled || !draft.ageCheckEnabled}
            error={ageOk ? undefined : `Between ${MIN_MINIMUM_AGE} and ${MAX_MINIMUM_AGE}`}
          />
          <TextField
            label="Message"
            autoComplete="off"
            multiline={2}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft.ageMessage}
            onChange={(ageMessage) => patch({ ageMessage })}
            disabled={disabled || !draft.ageCheckEnabled}
            helpText="{age} becomes the minimum age."
          />
        </BlockStack>

        <BlockStack gap="300">
          <Checkbox
            label="Local delivery only"
            checked={draft.localOnlyEnabled}
            onChange={(localOnlyEnabled) => patch({ localOnlyEnabled })}
            disabled={disabled}
            helpText="Alcohol can only be delivered to a zip in your delivery zones above. Pickup is always allowed."
          />
          <TextField
            label="Message"
            autoComplete="off"
            multiline={2}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft.localOnlyMessage}
            onChange={(localOnlyMessage) => patch({ localOnlyMessage })}
            disabled={disabled || !draft.localOnlyEnabled}
            helpText="{zip} becomes the shopper's zip code."
          />
        </BlockStack>

        <BlockStack gap="300">
          <Checkbox
            label="Not sold alone"
            checked={draft.notAloneEnabled}
            onChange={(notAloneEnabled) => patch({ notAloneEnabled })}
            disabled={disabled}
            helpText="The cart must also contain at least one product that isn't alcohol."
          />
          <TextField
            label="Message"
            autoComplete="off"
            multiline={2}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft.notAloneMessage}
            onChange={(notAloneMessage) => patch({ notAloneMessage })}
            disabled={disabled || !draft.notAloneEnabled}
          />
        </BlockStack>
      </InlineGrid>

      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h3" variant="headingSm">
              Checkout enforcement
            </Text>
            {statusView.badge}
          </InlineStack>
          {statusView.retry ? (
            <Button onClick={() => post({ action: "retry-alcohol-sync" })} loading={saving} disabled={!editable}>
              Retry
            </Button>
          ) : null}
        </InlineStack>
        <Text as="p" tone="subdued" variant="bodySm">
          {statusView.text}
        </Text>
        {syncError ? (
          <Banner tone="critical" title="Shopify refused the validation">
            <p>{syncError}</p>
          </Banner>
        ) : null}
      </BlockStack>

      <InlineStack>
        <Button
          variant="primary"
          onClick={save}
          loading={saving}
          disabled={editable ? !ageOk : draft.enabled || !rules.enabled}
        >
          {editable ? "Save alcohol rules" : "Turn enforcement off"}
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

function describeStatus(status: AlcoholValidationStatus): { badge: JSX.Element; text: string; retry: boolean } {
  switch (status.state) {
    case "active":
      return {
        badge: <Badge tone="success">Active</Badge>,
        text: "Checkout blocks orders that break these rules, even when the shopper skips the cart page.",
        retry: false,
      };
    case "off":
      return {
        badge: <Badge tone="attention">Turned off</Badge>,
        text: "The validation exists but is off because the switch above is off. Saving with the switch on turns it back on.",
        retry: false,
      };
    case "missing":
      return {
        badge: <Badge tone="attention">Not installed yet</Badge>,
        text: "Saving installs the checkout validation on this shop.",
        retry: true,
      };
    case "not-deployed":
      return {
        badge: <Badge tone="critical">Not deployed</Badge>,
        text: "The alcohol validation function isn't in the app version installed on this shop yet. Deploy the app, then come back. The cart block still applies the rules meanwhile.",
        retry: true,
      };
    case "scope-missing":
      return {
        badge: <Badge tone="critical">Permission missing</Badge>,
        text: "The app needs the write_validations permission. Deploy the new configuration, reopen the app and accept it.",
        retry: true,
      };
    default:
      return {
        badge: <Badge tone="critical">Error</Badge>,
        text: status.message,
        retry: true,
      };
  }
}

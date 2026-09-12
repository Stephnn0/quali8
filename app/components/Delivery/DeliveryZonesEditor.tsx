import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Checkbox,
  EmptyState,
  IndexTable,
  InlineStack,
  Modal,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { DeliveryConfig, DeliveryZoneRow } from "./types";

type Props = DeliveryConfig;

type Draft = {
  id: number | null;
  name: string;
  zipCodes: string;
  price: string;
  message: string;
  active: boolean;
};

const emptyDraft: Draft = {
  id: null,
  name: "",
  zipCodes: "",
  price: "",
  message: "",
  active: true,
};

const priceLabel = (price: number | null) =>
  price === null ? "Not shown" : price === 0 ? "Free" : `$${price.toFixed(2)}`;

/**
 * The delivery zip checker's admin: a master switch and the zones (name,
 * codes, price, message). Posts to the feature page's action.
 */
export default function DeliveryZonesEditor({ enabled, zones }: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();
  const saving = fetcher.state !== "idle";

  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZoneRow | null>(null);

  const submit = (body: Record<string, unknown>) =>
    fetcher.submit(
      { body: JSON.stringify(body) },
      { method: "POST", encType: "multipart/form-data" },
    );

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.code === "zone-saved") {
      shopify.toast.show("Zone saved");
      setDraft(null);
    }
    if (fetcher.data.code === "zone-deleted") shopify.toast.show("Zone deleted");
  }, [fetcher.state, fetcher.data, shopify]);

  const openNew = () => setDraft({ ...emptyDraft });
  const openEdit = (zone: DeliveryZoneRow) =>
    setDraft({
      id: zone.id,
      name: zone.name,
      zipCodes: zone.zipCodes.join(", "),
      price: zone.price === null ? "" : String(zone.price),
      message: zone.message ?? "",
      active: zone.active,
    });

  const saveDraft = () => {
    if (!draft) return;
    const price = draft.price.trim() === "" ? null : Number.parseFloat(draft.price);
    submit({
      action: "save-zone",
      id: draft.id,
      name: draft.name,
      zipCodes: draft.zipCodes,
      price: price !== null && Number.isFinite(price) ? price : null,
      message: draft.message || null,
      active: draft.active,
    });
  };

  const rows = zones.map((zone, index) => (
    <IndexTable.Row id={String(zone.id)} key={zone.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {zone.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {zone.zipCodes.length} {zone.zipCodes.length === 1 ? "code" : "codes"}
          {" · "}
          {zone.zipCodes.slice(0, 4).join(", ")}
          {zone.zipCodes.length > 4 ? "…" : ""}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {priceLabel(zone.price)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={zone.active ? "success" : undefined}>
          {zone.active ? "Active" : "Paused"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button icon={EditIcon} accessibilityLabel="Edit zone" onClick={() => openEdit(zone)} />
          <Button
            icon={DeleteIcon}
            accessibilityLabel="Delete zone"
            onClick={() => setDeleteTarget(zone)}
          />
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <BlockStack gap="400">
      {fetcher.data?.errors?.length ? (
        <Banner tone="critical" title={fetcher.data.errors[0].message} />
      ) : null}

      <InlineStack align="space-between" blockAlign="center" gap="300">
        <Checkbox
          label="Show the zip code checker in the bar"
          checked={enabled}
          onChange={(value) => submit({ action: "set-delivery-check", enabled: value })}
          helpText={
            enabled && zones.filter((zone) => zone.active).length === 0
              ? "Add at least one active zone or the checker stays hidden."
              : undefined
          }
        />
        <Button variant="primary" onClick={openNew}>
          Add zone
        </Button>
      </InlineStack>

      {zones.length === 0 ? (
        <EmptyState heading="No delivery zones yet" action={{ content: "Add zone", onAction: openNew }} image="">
          <p>
            A zone is a list of zip or postal codes with an optional delivery
            price and message. Use a star for a whole area, like 331*.
          </p>
        </EmptyState>
      ) : (
        <IndexTable
          resourceName={{ singular: "zone", plural: "zones" }}
          itemCount={zones.length}
          selectable={false}
          headings={[
            { title: "Zone" },
            { title: "Codes" },
            { title: "Price" },
            { title: "Status" },
            { title: "Actions" },
          ]}
        >
          {rows}
        </IndexTable>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit zone" : "Add zone"}
        primaryAction={{
          content: draft?.id ? "Save changes" : "Add zone",
          onAction: saveDraft,
          loading: saving,
          disabled: saving || !draft?.name.trim() || !draft?.zipCodes.trim(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setDraft(null) }]}
      >
        <Modal.Section>
          {draft ? (
            <BlockStack gap="400">
              <TextField
                label="Zone name"
                autoComplete="off"
                value={draft.name}
                onChange={(name) => setDraft({ ...draft, name })}
                placeholder="e.g. Downtown"
              />
              <TextField
                label="Zip or postal codes"
                autoComplete="off"
                multiline={4}
                value={draft.zipCodes}
                onChange={(zipCodes) => setDraft({ ...draft, zipCodes })}
                placeholder="33101, 33102, 331*"
                helpText="Separate with commas or new lines. End a code with * to match a whole prefix (331* covers 33101–33199)."
              />
              <TextField
                label="Delivery price"
                type="number"
                min={0}
                autoComplete="off"
                value={draft.price}
                onChange={(price) => setDraft({ ...draft, price })}
                prefix="$"
                placeholder="Leave empty to hide the price"
                helpText="Enter 0 for free delivery."
              />
              <TextField
                label="Message (optional)"
                autoComplete="off"
                value={draft.message}
                onChange={(message) => setDraft({ ...draft, message })}
                placeholder="e.g. Same-day before 2pm"
                maxLength={160}
              />
              <Checkbox
                label="Active"
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
              />
            </BlockStack>
          ) : null}
        </Modal.Section>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this zone?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: () => {
            if (deleteTarget) submit({ action: "delete-zone", id: deleteTarget.id });
            setDeleteTarget(null);
          },
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setDeleteTarget(null) }]}
      >
        <Modal.Section>
          <Text as="p">
            {deleteTarget ? `"${deleteTarget.name}" will be removed. Shoppers in those codes will be told you don't deliver there.` : ""}
          </Text>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}

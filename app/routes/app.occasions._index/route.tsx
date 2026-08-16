import { useCallback, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  IndexTable,
  Layout,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import emptyImage from "app/assets/customer-segment-icon.png";
import { occasionWindowContains } from "app/services/recommendations/constants";
import { FeatureHeader } from "app/components/OneApp";
import { loader, type OccasionRow } from "./loader";
import { action } from "./action";

export { loader, action };

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function windowLabel(occasion: OccasionRow): string {
  if (!occasion.startMonth || !occasion.endMonth) return "Always";
  const start = `${MONTHS[occasion.startMonth - 1]} ${occasion.startDay ?? 1}`;
  const end = `${MONTHS[occasion.endMonth - 1]} ${occasion.endDay ?? ""}`.trim();
  return `${start} – ${end}`;
}

export default function OccasionsIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const occasions = loaderData?.payload?.occasions ?? [];

  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [deleteTarget, setDeleteTarget] = useState<OccasionRow | null>(null);
  const closeModal = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    fetcher.submit(
      { body: JSON.stringify({ occasionId: deleteTarget.id }) },
      { method: "DELETE", encType: "multipart/form-data" },
    );
    shopify.toast.show("Occasion deleted");
    setDeleteTarget(null);
  };

  const now = new Date();

  const rows = occasions.map((occasion, index) => (
    <IndexTable.Row
      id={String(occasion.id)}
      key={occasion.id}
      position={index}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {occasion.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" tone="subdued" variant="bodySm">
          {windowLabel(occasion)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {occasion.productCount}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <BlockStack gap="100" inlineAlign="start">
          <Badge tone={occasion.status === "ACTIVE" ? "success" : undefined}>
            {occasion.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
          {occasion.status === "ACTIVE" &&
          occasion.startMonth &&
          occasionWindowContains(occasion, now) ? (
            <Badge tone="attention">In season now</Badge>
          ) : null}
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            icon={EditIcon}
            accessibilityLabel="Edit occasion"
            onClick={() => navigate(`/app/occasions/${occasion.id}`)}
          />
          <Button
            icon={DeleteIcon}
            accessibilityLabel="Delete occasion"
            onClick={() => setDeleteTarget(occasion)}
          />
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <FeatureHeader
        featureKey="occasion-match"
        tagline="Curate the products shoppers see for each occasion — shown by the Smart Recommendations block on product and cart pages."
        actions={
          <Button variant="primary" onClick={() => navigate("/app/occasions/new")}>
            Create occasion
          </Button>
        }
      />
      <Layout>
        <Layout.Section>
          {occasions.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "occasion", plural: "occasions" }}
                itemCount={occasions.length}
                selectable={false}
                headings={[
                  { title: "Occasion" },
                  { title: "Window" },
                  { title: "Products" },
                  { title: "Status" },
                  { title: "Actions" },
                ]}
              >
                {rows}
              </IndexTable>
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="Create your first occasion"
                action={{
                  content: "Create occasion",
                  onAction: () => navigate("/app/occasions/new"),
                }}
                image={emptyImage}
              >
                <p>
                  Occasions like Mother&rsquo;s Day or Sympathy group the
                  products you want recommended at the right moment.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={deleteTarget !== null}
        onClose={closeModal}
        title="Delete this occasion?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[{ content: "Cancel", onAction: closeModal }]}
      >
        <Modal.Section>
          <Text as="p">
            {deleteTarget
              ? `"${deleteTarget.name}" and its curated products will be removed. The storefront blocks will stop recommending for it.`
              : ""}
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

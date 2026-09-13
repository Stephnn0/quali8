import { useCallback, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  IndexTable,
  InlineGrid,
  Layout,
  List,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import emptyImage from "app/assets/customer-segment-icon.png";
import storefrontShowcaseImage from "app/assets/recs-storefront-showcase.png";
import themeEditorSettingsImage from "app/assets/recs-theme-editor-settings.png";
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
        <Text as="span" variant="bodySm">
          {occasion.productCount} {occasion.productCount === 1 ? "product" : "products"}
          {occasion.collectionCount
            ? ` · ${occasion.collectionCount} ${occasion.collectionCount === 1 ? "collection" : "collections"}`
            : ""}
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
        featureKey="occasions-gifts"
        tagline="Create occasions and connect products or whole collections to each one. The Occasions + Gifts block shows them on your product pages."
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
                  { title: "Connected" },
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

        <Layout.Section>
          <BlockStack gap="300">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Show it on your storefront
              </Text>
              <Text as="p" tone="subdued">
                Occasions power the Occasions + Gifts app block on product
                pages, and the occasion picker on the delivery checkout&rsquo;s
                Options step. Cart upsells come from Smart Recommendations.
              </Text>
            </BlockStack>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <Card padding="0">
                <Box background="bg-surface-secondary" padding="400">
                  <img
                    src={storefrontShowcaseImage}
                    alt="Occasions + Gifts block on a product page, with occasion chips above recommended products"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "220px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                </Box>
                <Box padding="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Gift picks on product pages
                    </Text>
                    <Text as="p" tone="subdued">
                      The Occasions + Gifts block shows the products and
                      collections you connect to each occasion, with occasion
                      chips and one-tap add to cart. Occasions are optional:
                      with none in season, shoppers still see gift picks.
                    </Text>
                  </BlockStack>
                </Box>
              </Card>
              <Card padding="0">
                <Box background="bg-surface-secondary" padding="400">
                  <img
                    src={themeEditorSettingsImage}
                    alt="Theme editor settings panel for the Occasions + Gifts block, showing heading, labels, after-add behavior, and color options"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "220px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                </Box>
                <Box padding="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Enable and customize in the theme editor
                    </Text>
                    <List type="number">
                      <List.Item>
                        In your Shopify admin, go to Online Store &rarr; Themes
                        &rarr; Customize.
                      </List.Item>
                      <List.Item>
                        Open the Product template, then choose Add block
                        &rarr; Apps &rarr; Occasions + Gifts.
                      </List.Item>
                      <List.Item>
                        Use the block settings to edit the heading, occasion
                        chips, layout, button, and colors — no code needed.
                      </List.Item>
                    </List>
                  </BlockStack>
                </Box>
              </Card>
            </InlineGrid>
          </BlockStack>
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

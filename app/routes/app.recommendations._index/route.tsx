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
  InlineGrid,
  Layout,
  List,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DeleteIcon,
  EditIcon,
} from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import emptyImage from "app/assets/customer-segment-icon.png";
import { FeatureHeader } from "app/components/OneApp";
import { loader, type RuleRow } from "./loader";
import { action } from "./action";

export { loader, action };

/**
 * Smart Recommendations: the merchant's rules for the cart page block.
 * Rules are checked top to bottom; the first one whose condition matches
 * the cart decides what shoppers see.
 */
export default function RecommendationRulesIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const rules = loaderData?.payload?.rules ?? [];

  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [deleteTarget, setDeleteTarget] = useState<RuleRow | null>(null);
  const closeModal = useCallback(() => setDeleteTarget(null), []);

  const submit = (body: Record<string, unknown>) =>
    fetcher.submit(
      { body: JSON.stringify(body) },
      { method: "POST", encType: "multipart/form-data" },
    );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    submit({ action: "delete", ruleId: deleteTarget.id });
    shopify.toast.show("Rule deleted");
    setDeleteTarget(null);
  };

  const rows = rules.map((rule, index) => (
    <IndexTable.Row id={String(rule.id)} key={rule.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued" numeric>
          {index + 1}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {rule.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm">
          {rule.when}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm">
          {rule.show}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {rule.limit}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={rule.status === "ACTIVE" ? "success" : undefined}>
          {rule.status === "ACTIVE" ? "Active" : "Paused"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            icon={ArrowUpIcon}
            accessibilityLabel="Move up"
            disabled={index === 0}
            onClick={() => submit({ action: "move", ruleId: rule.id, direction: "up" })}
          />
          <Button
            icon={ArrowDownIcon}
            accessibilityLabel="Move down"
            disabled={index === rules.length - 1}
            onClick={() => submit({ action: "move", ruleId: rule.id, direction: "down" })}
          />
          <Button
            onClick={() =>
              submit({
                action: "status",
                ruleId: rule.id,
                status: rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
              })
            }
          >
            {rule.status === "ACTIVE" ? "Pause" : "Activate"}
          </Button>
          <Button
            icon={EditIcon}
            accessibilityLabel="Edit rule"
            onClick={() => navigate(`/app/recommendations/${rule.id}`)}
          />
          <Button
            icon={DeleteIcon}
            accessibilityLabel="Delete rule"
            onClick={() => setDeleteTarget(rule)}
          />
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <FeatureHeader
        featureKey="smart-recommendations"
        tagline="Rules decide what the cart page suggests. The first rule that matches the cart wins; with no rules, shoppers see your newest products."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/app/recommendations/new")}
          >
            Create rule
          </Button>
        }
      />
      <Layout>
        <Layout.Section>
          {rules.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "rule", plural: "rules" }}
                itemCount={rules.length}
                selectable={false}
                headings={[
                  { title: "#" },
                  { title: "Rule" },
                  { title: "When" },
                  { title: "Show" },
                  { title: "Max" },
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
                heading="Create your first rule"
                action={{
                  content: "Create rule",
                  onAction: () => navigate("/app/recommendations/new"),
                }}
                image={emptyImage}
              >
                <p>
                  For example: when the cart has a product from Bouquets,
                  show vases under $40. Until you add a rule, the cart block
                  shows your newest products.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  How rules work
                </Text>
                <List type="bullet">
                  <List.Item>
                    <strong>When</strong> is the condition: every cart, the
                    cart contains a product from a collection, the cart
                    contains a specific product, or the cart total is above an
                    amount.
                  </List.Item>
                  <List.Item>
                    <strong>Show</strong> is the source: a collection, a tag,
                    your newest products, or products you pick by hand. Add an
                    optional price range and a maximum.
                  </List.Item>
                  <List.Item>
                    Products already in the cart are skipped, and rules are
                    checked top to bottom, so put your most specific rule
                    first.
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Show it on the cart page
                </Text>
                <List type="number">
                  <List.Item>
                    In your Shopify admin, go to Online Store &rarr; Themes
                    &rarr; Customize.
                  </List.Item>
                  <List.Item>
                    Open the Cart template, then choose Add block &rarr; Apps
                    &rarr; Smart Recommendations.
                  </List.Item>
                  <List.Item>
                    Use the block settings for the heading, layout, button,
                    and colors. A rule&rsquo;s own heading overrides the
                    block heading when it matches.
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>
      </Layout>

      <Modal
        open={deleteTarget !== null}
        onClose={closeModal}
        title="Delete this rule?"
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
              ? `"${deleteTarget.name}" will be removed. The cart block will fall through to the next rule.`
              : ""}
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

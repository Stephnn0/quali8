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
  InlineStack,
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
 * Smart Recommendations: the merchant's rules for the home page block.
 * Rules are checked top to bottom; the first one whose condition matches
 * the shopper decides what the block shows (a second block set to
 * "2nd matching rule" shows the next one).
 */
export default function RecommendationRulesIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const rules = loaderData?.payload?.rules ?? [];
  const setup = loaderData?.payload?.setup ?? null;

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
        tagline="Rules decide what the home page suggests. The first rule that matches the shopper wins; with no rules, shoppers see your newest products."
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
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Set up the home page block
              </Text>
              <List type="number">
                <List.Item>
                  Add the <strong>Smart Recommendations</strong> block to your
                  home page and place it where you want the rail.
                </List.Item>
                <List.Item>
                  Turn on the <strong>Smart recs tracker</strong> app embed so
                  viewed products and returning visitors count. Without it only
                  cart and &ldquo;every visitor&rdquo; rules can fire.
                </List.Item>
              </List>
              {setup ? (
                <InlineStack gap="200">
                  <Button url={setup.addBlock} target="_blank" variant="primary">
                    Add block to home page
                  </Button>
                  <Button url={setup.enableTracker} target="_blank">
                    Turn on tracker embed
                  </Button>
                </InlineStack>
              ) : null}
            </BlockStack>
          </Card>
        </Layout.Section>

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
                  For example: when a shopper viewed a product from Bouquets,
                  show vases under $40 on the home page. Until you add a rule,
                  the home page block shows your newest products.
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
                    <strong>When</strong> is the condition: every visitor, a
                    returning visitor, the shopper viewed a product or a
                    collection, or the cart contains a product, a collection,
                    or a minimum total.
                  </List.Item>
                  <List.Item>
                    <strong>Show</strong> is the source: a collection, a tag,
                    your newest products, products you pick by hand, recently
                    viewed products, or products related to what they viewed.
                    Add an optional price range and a maximum.
                  </List.Item>
                  <List.Item>
                    Rules are checked top to bottom, so put your most specific
                    rule first. Products already in the cart are skipped when
                    the rule says so, and a product never repeats across
                    stacked blocks.
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Where shoppers see it
                </Text>
                <List type="bullet">
                  <List.Item>
                    Recommendations appear in the <strong>Smart Recommendations</strong>
                    block on your home page: image, title, price, and a quick Add
                    button.
                  </List.Item>
                  <List.Item>
                    Add the block more than once and set each copy to the 1st,
                    2nd or 3rd matching rule to stack rails.
                  </List.Item>
                  <List.Item>
                    A rule&rsquo;s own heading is shown above its products when it
                    matches; otherwise the block&rsquo;s fallback heading.
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
              ? `"${deleteTarget.name}" will be removed. The home page block will fall through to the next rule.`
              : ""}
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";
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
  Modal,
  Page,
  Text,
  Tooltip,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, RefreshIcon } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import emptyImage from "app/assets/customer-segment-icon.png";
import { describeCondition } from "app/services/audiences/describeCondition";
import { FeatureHeader } from "app/components/OneApp";
import { CustomerInsightsSection } from "./components/insights/CustomerInsightsSection";
import { loader, type AudienceRow } from "./loader";

export { loader };

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(
    amount,
  );

function LastSynced({
  lastSyncedAt,
}: {
  lastSyncedAt: AudienceRow["lastSyncedAt"];
}) {
  if (!lastSyncedAt) {
    return <Badge tone="attention">Never</Badge>;
  }
  const date = new Date(lastSyncedAt);
  return (
    <Text as="span" tone="subdued" variant="bodySm">
      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </Text>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="p" variant="headingLg">
          {value}
        </Text>
        {detail ? (
          <Text as="p" tone="subdued" variant="bodySm">
            {detail}
          </Text>
        ) : null}
      </BlockStack>
    </Card>
  );
}

export default function Audiences() {
  const loaderData = useLoaderData<typeof loader>();
  const audiences = loaderData?.payload?.audiences ?? [];
  const summary = loaderData?.payload?.summary;
  const insights = loaderData?.payload?.insights ?? null;

  const [selectedAudience, setSelectedAudience] = useState<{
    id: number;
    conditionIds: number[];
  } | null>(null);
  const [modalActive, setModalActive] = useState(false);
  const handleModalChange = useCallback(
    () => setModalActive((prev) => !prev),
    [],
  );

  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleDeleteClick = (id: number, conditionIds: number[]) => {
    setSelectedAudience({ id, conditionIds });
    setModalActive(true);
  };

  const handleDeleteConfirm = () => {
    setModalActive(false);
    if (!selectedAudience) return;
    fetcher.submit(
      {
        body: JSON.stringify({
          qualifierId: selectedAudience.id,
          conditionIds: selectedAudience.conditionIds,
        }),
      },
      {
        method: "DELETE",
        encType: "multipart/form-data",
        action: "/api/qualifiers",
      },
    );
    shopify.toast.show("Audience deleted");
  };

  const refreshFetcher = useFetcher();
  const refreshingId =
    refreshFetcher.state !== "idle"
      ? JSON.parse(String(refreshFetcher.formData?.get("body") ?? "{}"))
          .qualifierId
      : null;

  const handleRefresh = (id: number) => {
    refreshFetcher.submit(
      { body: JSON.stringify({ qualifierId: id }) },
      {
        method: "PATCH",
        encType: "multipart/form-data",
        action: "/api/qualifiers",
      },
    );
    shopify.toast.show("Refreshing audience…");
  };

  // Pagination
  const [, setSearchParams] = useSearchParams();
  const currentPage = loaderData?.payload?.page || 1;
  const totalItems = loaderData?.payload?.total ?? 0;
  const itemsPerPage = loaderData?.payload?.itemsPerPage ?? 15;
  const hasNext = currentPage * itemsPerPage < totalItems;
  const hasPrevious = currentPage > 1;
  const goToPage = (page: number) =>
    setSearchParams({ page: page.toString() });

  const rowMarkup = audiences.map((audience, index) => (
    <IndexTable.Row id={String(audience.id)} key={audience.id} position={index}>
      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {audience.name}
          </Text>
          <Text variant="bodySm" tone="subdued" as="span">
            {audience.description}
          </Text>
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Tooltip
          content={audience.conditions
            .map(describeCondition)
            .join(audience.conditionLogicType === "AND" ? " and " : " or ")}
        >
          <Badge>
            {`${audience.conditions.length} ${
              audience.conditions.length === 1 ? "condition" : "conditions"
            }`}
          </Badge>
        </Tooltip>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {audience.stats.memberCount}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {money(audience.stats.totalRevenue)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {audience.stats.averageOrders}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <LastSynced lastSyncedAt={audience.lastSyncedAt} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            icon={RefreshIcon}
            accessibilityLabel="Refresh members from Shopify"
            loading={refreshingId === audience.id}
            onClick={() => handleRefresh(audience.id)}
          />
          <Link to={`/app/qualifiers/${audience.id}`}>
            <Button icon={EditIcon} accessibilityLabel="Edit audience" />
          </Link>
          <Button
            icon={DeleteIcon}
            accessibilityLabel="Delete audience"
            onClick={() =>
              handleDeleteClick(
                audience.id,
                audience.conditions.map((condition) => condition.id),
              )
            }
          />
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <FeatureHeader
        featureKey="customer-insights"
        tagline="See who your customers are, group them into audiences, and target them with promotions."
        actions={
          // Client-side navigation only — a plain link would trigger a full
          // document load and dump the merchant on the login screen.
          <Button variant="primary" onClick={() => navigate("/app/qualifiers/new")}>
            Create audience
          </Button>
        }
      />
      <Layout>
        {insights ? (
          <Layout.Section>
            <CustomerInsightsSection insights={insights} />
          </Layout.Section>
        ) : null}

        {summary && audiences.length > 0 ? (
          <Layout.Section>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Audience reach
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                <StatCard label="Audiences" value={String(summary.audienceCount)} />
                <StatCard
                  label="Customers reached"
                  value={String(summary.reachedCustomers)}
                  detail="Distinct customers across all audiences"
                />
                <StatCard
                  label="Revenue represented"
                  value={money(summary.totalRevenue)}
                  detail="Lifetime spend of reached customers"
                />
              </InlineGrid>
            </BlockStack>
          </Layout.Section>
        ) : null}

        <Layout.Section>
          {audiences.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "audience", plural: "audiences" }}
                itemCount={audiences.length}
                selectable={false}
                headings={[
                  { title: "Audience" },
                  { title: "Conditions" },
                  { title: "Members" },
                  { title: "Revenue" },
                  { title: "Avg orders" },
                  { title: "Last synced" },
                  { title: "Actions" },
                ]}
                pagination={
                  hasNext || hasPrevious
                    ? {
                        hasNext,
                        hasPrevious,
                        onNext: () => goToPage(currentPage + 1),
                        onPrevious: () => goToPage(currentPage - 1),
                      }
                    : undefined
                }
              >
                {rowMarkup}
              </IndexTable>
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="Create your first audience"
                action={{
                  content: "Create audience",
                  onAction: () => navigate("/app/qualifiers/new"),
                }}
                image={emptyImage}
              >
                <p>
                  Group customers by tags, order count, spending, or country —
                  then target them with shipping promotions.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={modalActive}
        onClose={handleModalChange}
        title="Delete this audience?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDeleteConfirm,
        }}
        secondaryActions={[{ content: "Cancel", onAction: handleModalChange }]}
      >
        <Modal.Section>
          <Text as="p">
            The audience and its conditions will be removed. Promotions that
            target it will stop matching these customers.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

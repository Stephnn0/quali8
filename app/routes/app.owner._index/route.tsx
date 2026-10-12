import { useMemo, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  Badge,
  BlockStack,
  Box,
  Card,
  EmptyState,
  IndexTable,
  InlineGrid,
  InlineStack,
  Link,
  Page,
  Tabs,
  Text,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { loadOwnerOverview } from "app/services/owner/ownerOverview.server";
import {
  OWNER_FILTERS,
  filterStores,
  isOwnerShop,
  type OwnerFilter,
  type OwnerStoreRow,
} from "app/services/owner/ownerOverview";

/**
 * Owner-only overview of every merchant: plan, trial, uninstalls and
 * contact details. Served only to the shops in `APP.OWNER_SHOPS`; any other
 * shop gets a 404 so the page does not exist for merchants.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!isOwnerShop(session.shop)) {
    throw new Response("Not found", { status: 404 });
  }
  return loadOwnerOverview(db);
};

type Row = Omit<
  OwnerStoreRow,
  "installedAt" | "lastActivityAt" | "trialEndsAt" | "currentPeriodEnd"
> & {
  installedAt: string;
  lastActivityAt: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const money = (amount: number) =>
  amount.toLocaleString(undefined, { style: "currency", currency: "USD" });

function StateBadge({ row }: { row: Row }) {
  switch (row.state) {
    case "uninstalled":
      return <Badge tone="critical">Uninstalled</Badge>;
    case "trial":
      return (
        <Badge tone="attention">
          {`Trial · ${row.trialDaysLeft ?? 0}d left`}
        </Badge>
      );
    case "paid":
      return <Badge tone="success">Paying</Badge>;
    default:
      return <Badge>Free</Badge>;
  }
}

function PlanBadge({ row }: { row: Row }) {
  if (!row.installed) return <Text as="span" tone="subdued">—</Text>;
  const tone = row.plan === "Advance" ? "success" : row.plan === "Free" ? undefined : "warning";
  return (
    <InlineStack gap="100" blockAlign="center">
      <Badge tone={tone}>{row.plan}</Badge>
      {row.test ? <Badge tone="info">Test</Badge> : null}
    </InlineStack>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "critical" | "subdued" }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="headingLg" tone={tone}>
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function OwnerOverview() {
  const { rows, summary, generatedAt } = useLoaderData<typeof loader>();
  const [selectedTab, setSelectedTab] = useState(0);
  const [query, setQuery] = useState("");

  const filter: OwnerFilter = OWNER_FILTERS[selectedTab]?.id ?? "all";
  const visibleRows = useMemo(
    () => filterStores(rows as unknown as OwnerStoreRow[], filter, query) as unknown as Row[],
    [rows, filter, query],
  );

  const tabs = OWNER_FILTERS.map((item) => ({
    id: item.id,
    content: `${item.label} (${filterStores(rows as unknown as OwnerStoreRow[], item.id, "").length})`,
  }));

  return (
    <Page
      title="Owner overview"
      subtitle={`Every store that installed OneApp · as of ${new Date(generatedAt).toLocaleString()}`}
    >
      <BlockStack gap="500">
        <InlineGrid columns={{ xs: 2, sm: 3, md: 4, lg: 8 }} gap="300">
          <Stat label="Stores" value={summary.total} />
          <Stat label="Installed" value={summary.installed} tone="success" />
          <Stat label="Uninstalled" value={summary.uninstalled} tone="critical" />
          <Stat label="Free" value={summary.free} />
          <Stat label="Advance" value={summary.advance} />
          <Stat label="In trial" value={summary.trial} />
          <Stat label="Paying" value={summary.paying} tone="success" />
          <Stat label="MRR" value={money(summary.monthlyRevenue)} />
        </InlineGrid>

        <Card padding="0">
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box padding="300">
              <TextField
                label="Search"
                labelHidden
                autoComplete="off"
                placeholder="Search by shop, store name, contact or email"
                value={query}
                onChange={setQuery}
                clearButton
                onClearButtonClick={() => setQuery("")}
              />
            </Box>
            {visibleRows.length === 0 ? (
              <EmptyState heading="No stores match" image="">
                <p>Try another filter or clear the search.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "store", plural: "stores" }}
                itemCount={visibleRows.length}
                selectable={false}
                headings={[
                  { title: "Store" },
                  { title: "Contact" },
                  { title: "Status" },
                  { title: "App plan" },
                  { title: "Trial ends" },
                  { title: "Renews" },
                  { title: "$/mo" },
                  { title: "Shopify plan" },
                  { title: "Installed" },
                  { title: "Last activity" },
                  { title: "Version" },
                ]}
              >
                {visibleRows.map((row, index) => (
                  <IndexTable.Row id={row.shop} key={row.shop} position={index}>
                    <IndexTable.Cell>
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="semibold">
                          {row.storeName}
                        </Text>
                        <Link url={`https://${row.shop}`} target="_blank" removeUnderline>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {row.shop}
                          </Text>
                        </Link>
                        {row.country ? (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {[row.country, row.currency].filter(Boolean).join(" · ")}
                          </Text>
                        ) : null}
                      </BlockStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <BlockStack gap="050">
                        <Text as="span">{row.contactName ?? "—"}</Text>
                        {row.contactEmail ? (
                          <Link url={`mailto:${row.contactEmail}`} removeUnderline>
                            <Text as="span" variant="bodySm">
                              {row.contactEmail}
                            </Text>
                          </Link>
                        ) : (
                          <Text as="span" variant="bodySm" tone="subdued">
                            no email on file
                          </Text>
                        )}
                      </BlockStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <BlockStack gap="050">
                        <StateBadge row={row} />
                        {!row.installed && row.lastSubscription ? (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {`was ${row.lastSubscription.name}${
                              row.lastSubscription.cancelMethod === "UNINSTALL"
                                ? ", cancelled by uninstall"
                                : ""
                            }`}
                          </Text>
                        ) : null}
                      </BlockStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <PlanBadge row={row} />
                    </IndexTable.Cell>
                    <IndexTable.Cell>{formatDate(row.trialEndsAt)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      {row.state === "free" || !row.installed ? "—" : formatDate(row.currentPeriodEnd)}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {row.monthlyPrice > 0 ? money(row.monthlyPrice) : "—"}
                    </IndexTable.Cell>
                    <IndexTable.Cell>{row.shopifyPlan ?? "—"}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <BlockStack gap="050">
                        <Text as="span">{formatDate(row.installedAt)}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {`${row.daysInstalled}d ago`}
                        </Text>
                      </BlockStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{formatDate(row.lastActivityAt)}</IndexTable.Cell>
                    <IndexTable.Cell>{row.appVersion}</IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Tabs>
        </Card>

        <Text as="p" variant="bodySm" tone="subdued">
          Plan and trial come from the app's subscription rows, kept in sync by
          the APP_SUBSCRIPTIONS_UPDATE webhook. Uninstalls come from the
          APP_UNINSTALLED webhook. Contact details come from the account
          owner's session while the app is installed, otherwise from the shop
          data captured at setup.
        </Text>
      </BlockStack>
    </Page>
  );
}

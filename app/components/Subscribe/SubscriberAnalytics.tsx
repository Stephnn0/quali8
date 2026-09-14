import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  IndexTable,
  InlineGrid,
  InlineStack,
  Link,
  Text,
  Tooltip,
} from "@shopify/polaris";
import type {
  SubscribeAnalytics,
  SubscriberRow,
} from "app/services/subscribe/subscribers.server";
import { POPUP_CUSTOMER_TAG } from "app/services/subscribe/subscribeAnalytics";

type Props = { analytics: SubscribeAnalytics };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function Stat({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <Box background="bg-surface-secondary" padding="300" borderRadius="200">
      <BlockStack gap="050">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="headingLg">
          {value}
        </Text>
        {help ? (
          <Text as="p" variant="bodySm" tone="subdued">
            {help}
          </Text>
        ) : null}
      </BlockStack>
    </Box>
  );
}

function ResultBadge({ row }: { row: SubscriberRow }) {
  if (row.result === "FAILED") {
    return (
      <Tooltip content={row.lastError ?? "Shopify did not accept the customer"}>
        <Badge tone="critical">Not in Shopify</Badge>
      </Tooltip>
    );
  }
  return (
    <Badge tone="success">{row.result === "CREATED" ? "New customer" : "Existing customer"}</Badge>
  );
}

/** Daily bars for the last 30 days: views behind, subscribes in front. */
function DailyBars({ days }: { days: SubscribeAnalytics["last30"]["days"] }) {
  const max = Math.max(1, ...days.map((day) => day.views));
  return (
    <div
      role="img"
      aria-label="Popup views and subscribes per day, last 30 days"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "3px",
        height: "72px",
        padding: "4px 0",
      }}
    >
      {days.map((day) => (
        <Tooltip
          key={day.day}
          content={`${day.day}: ${day.views} shown, ${day.subscribes} subscribed`}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              display: "flex",
              alignItems: "flex-end",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${Math.max(day.views ? 6 : 2, (day.views / max) * 100)}%`,
                background: "var(--p-color-bg-fill-info-secondary, #d6e4ff)",
                borderRadius: "3px 3px 0 0",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: `${(day.subscribes / max) * 100}%`,
                background: "var(--p-color-bg-fill-success, #29845a)",
                borderRadius: "3px 3px 0 0",
              }}
            />
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * The Subscribers card on the Subscribe Boost page: who subscribed through
 * the popup, whether they were saved in Shopify customers, and how the
 * popup converted over the last 30 days.
 */
export default function SubscriberAnalytics({ analytics }: Props) {
  const { last30, recent, totalSubscribers, failedSubscribers, canWriteCustomers } = analytics;

  const customersUrl = `shopify:admin/customers?tag=${encodeURIComponent(POPUP_CUSTOMER_TAG)}`;

  return (
    <BlockStack gap="400">
      {!canWriteCustomers ? (
        <Banner tone="warning" title="Subscribers can't be saved in Shopify customers yet">
          <p>
            Add the <code>write_customers</code> access scope to the app configuration and
            redeploy, then approve the new permission. Until then, signups are recorded here
            and sent through your theme&rsquo;s newsletter form instead.
          </p>
        </Banner>
      ) : null}
      {failedSubscribers > 0 ? (
        <Banner tone="critical" title={`${failedSubscribers} ${failedSubscribers === 1 ? "signup wasn't" : "signups weren't"} saved in Shopify`}>
          <p>Hover the &ldquo;Not in Shopify&rdquo; badge on a row to see why.</p>
        </Banner>
      ) : null}

      <InlineGrid columns={{ xs: 2, md: 4 }} gap="300">
        <Stat label="Subscribers" value={String(totalSubscribers)} help="All time, through the popup" />
        <Stat label="Subscribed" value={String(last30.subscribes)} help="Last 30 days" />
        <Stat label="Popup shown" value={String(last30.views)} help={`${last30.dismissals} closed without subscribing`} />
        <Stat label="Conversion" value={`${last30.conversionRate}%`} help="Subscribed ÷ shown, last 30 days" />
      </InlineGrid>

      <Card padding="300">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingSm">
              Last 30 days
            </Text>
            <InlineStack gap="300">
              <InlineStack gap="100" blockAlign="center">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--p-color-bg-fill-info-secondary, #d6e4ff)", display: "inline-block" }} />
                <Text as="span" variant="bodySm" tone="subdued">Shown</Text>
              </InlineStack>
              <InlineStack gap="100" blockAlign="center">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--p-color-bg-fill-success, #29845a)", display: "inline-block" }} />
                <Text as="span" variant="bodySm" tone="subdued">Subscribed</Text>
              </InlineStack>
            </InlineStack>
          </InlineStack>
          <DailyBars days={last30.days} />
        </BlockStack>
      </Card>

      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          Recent subscribers
        </Text>
        <Button url={customersUrl} target="_top" variant="plain">
          View all in Shopify customers
        </Button>
      </InlineStack>

      {recent.length === 0 ? (
        <Text as="p" tone="subdued">
          Nobody has subscribed through the popup yet. Subscribers appear here as soon as the
          popup is live on your storefront.
        </Text>
      ) : (
        <IndexTable
          resourceName={{ singular: "subscriber", plural: "subscribers" }}
          itemCount={recent.length}
          selectable={false}
          headings={[
            { title: "Email" },
            { title: "Name" },
            { title: "Shopify" },
            { title: "Code" },
            { title: "Subscribed" },
          ]}
        >
          {recent.map((row, index) => (
            <IndexTable.Row id={String(row.id)} key={row.id} position={index}>
              <IndexTable.Cell>
                {row.customerAdminId ? (
                  <Link url={`shopify:admin/customers/${row.customerAdminId}`} target="_top">
                    {row.email}
                  </Link>
                ) : (
                  <Text as="span">{row.email}</Text>
                )}
              </IndexTable.Cell>
              <IndexTable.Cell>{row.firstName ?? "—"}</IndexTable.Cell>
              <IndexTable.Cell>
                <ResultBadge row={row} />
              </IndexTable.Cell>
              <IndexTable.Cell>{row.discountCode || "—"}</IndexTable.Cell>
              <IndexTable.Cell>
                <BlockStack gap="050">
                  <Text as="span">{formatDate(row.lastSubscribedAt)}</Text>
                  {row.subscribeCount > 1 ? (
                    <Text as="span" variant="bodySm" tone="subdued">
                      {row.subscribeCount} times, first {formatDate(row.createdAt)}
                    </Text>
                  ) : null}
                </BlockStack>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      )}
    </BlockStack>
  );
}

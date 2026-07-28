import {
  BlockStack,
  Card,
  InlineGrid,
  Text,
} from "@shopify/polaris";
import type { CustomerInsights } from "app/services/audiences/customerInsights";
import { DonutChart } from "./DonutChart";
import { BarList } from "./BarList";
import { ColumnChart } from "./ColumnChart";

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(
    amount,
  );

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="p" variant="headingLg">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

/** Store-wide analytics shown above the audiences table. */
export function CustomerInsightsSection({
  insights,
}: {
  insights: CustomerInsights;
}) {
  return (
    <BlockStack gap="400">
      <BlockStack gap="100">
        <Text as="h2" variant="headingMd">
          Customer insights
        </Text>
        <Text as="p" tone="subdued" variant="bodySm">
          {insights.sampled
            ? `Based on your ${insights.sampleSize} most recent customers.`
            : "Based on all your customers."}
        </Text>
      </BlockStack>

      <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
        <Tile
          label="Total customers"
          value={new Intl.NumberFormat("en").format(insights.totalCustomers)}
        />
        <Tile
          label="Repeat buyers"
          value={`${Math.round(insights.repeatBuyerShare * 100)}%`}
        />
        <Tile label="Average spend" value={money(insights.averageSpend)} />
        <Tile label="New this month" value={String(insights.newThisMonth)} />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              Customers by country
            </Text>
            {insights.byCountry.length > 0 ? (
              <DonutChart slices={insights.byCountry} />
            ) : (
              <Text as="p" tone="subdued">
                No country data yet — customers appear here once they have an
                address.
              </Text>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              Lifetime spend
            </Text>
            <BarList buckets={insights.spendBuckets} />
          </BlockStack>
        </Card>
      </InlineGrid>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            New customers
          </Text>
          <ColumnChart points={insights.byMonth} />
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

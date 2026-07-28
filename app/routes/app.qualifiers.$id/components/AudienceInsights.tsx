import {
  Badge,
  BlockStack,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import {
  computeAudienceStats,
  type AudienceMember,
} from "app/services/audiences/audienceStats";
import { describeCondition } from "app/services/audiences/describeCondition";

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(
    amount,
  );

type Props = {
  customers: AudienceMember[];
  conditions: Array<{ type: string; comparisonType: string; value: string }>;
  conditionLogicType: string;
  lastSyncedAt?: string | Date | null;
};

/** Read-only analytics card shown when editing an existing audience. */
export function AudienceInsights({
  customers,
  conditions,
  conditionLogicType,
  lastSyncedAt,
}: Props) {
  const stats = computeAudienceStats(customers);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Audience insights
          </Text>
          {lastSyncedAt ? (
            <Text as="span" tone="subdued" variant="bodySm">
              Last synced {new Date(lastSyncedAt).toLocaleDateString()}
            </Text>
          ) : (
            <Badge tone="attention">Never synced</Badge>
          )}
        </InlineStack>

        <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
          {[
            { label: "Members", value: String(stats.memberCount) },
            { label: "Lifetime revenue", value: money(stats.totalRevenue) },
            { label: "Avg spend", value: money(stats.averageSpend) },
            { label: "Avg orders", value: String(stats.averageOrders) },
          ].map(({ label, value }) => (
            <BlockStack gap="050" key={label}>
              <Text as="p" tone="subdued" variant="bodySm">
                {label}
              </Text>
              <Text as="p" variant="headingLg">
                {value}
              </Text>
            </BlockStack>
          ))}
        </InlineGrid>

        {stats.topCountries.length > 0 ? (
          <>
            <Divider />
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Top countries
              </Text>
              {stats.topCountries.map(({ country, count, share }) => (
                <BlockStack gap="050" key={country}>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">
                      {country}
                    </Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {count} · {Math.round(share * 100)}%
                    </Text>
                  </InlineStack>
                  <ProgressBar
                    progress={share * 100}
                    size="small"
                    tone="success"
                  />
                </BlockStack>
              ))}
            </BlockStack>
          </>
        ) : null}

        {conditions.length > 0 ? (
          <>
            <Divider />
            <InlineStack gap="150" wrap>
              {conditions.map((condition, index) => (
                <InlineStack gap="150" blockAlign="center" key={index}>
                  {index > 0 ? (
                    <Text as="span" tone="subdued" variant="bodySm">
                      {conditionLogicType === "AND" ? "and" : "or"}
                    </Text>
                  ) : null}
                  <Badge>{describeCondition(condition)}</Badge>
                </InlineStack>
              ))}
            </InlineStack>
          </>
        ) : null}
      </BlockStack>
    </Card>
  );
}

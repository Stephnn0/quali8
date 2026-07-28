import {
  Badge,
  BlockStack,
  Button,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { ExportIcon } from "@shopify/polaris-icons";
import {
  computeAudienceStats,
  type AudienceMember,
} from "app/services/audiences/audienceStats";
import { describeCondition } from "app/services/audiences/describeCondition";
import {
  membersToCsv,
  type CsvMember,
} from "app/services/audiences/membersCsv";

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(
    amount,
  );

type Props = {
  customers: Array<AudienceMember & Partial<CsvMember>>;
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

  const handleExport = () => {
    const csv = membersToCsv(customers as CsvMember[]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audience-members.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Audience insights
          </Text>
          <InlineStack gap="200" blockAlign="center">
            {lastSyncedAt ? (
              <Text as="span" tone="subdued" variant="bodySm">
                Last synced {new Date(lastSyncedAt).toLocaleDateString()}
              </Text>
            ) : (
              <Badge tone="attention">Never synced</Badge>
            )}
            <Button
              icon={ExportIcon}
              onClick={handleExport}
              disabled={stats.memberCount === 0}
            >
              Export CSV
            </Button>
          </InlineStack>
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

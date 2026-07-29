import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import type { SeasonStatus } from "../../route";

type Pillar = { label: string; active: boolean };

export function seasonPillars(status: SeasonStatus): Pillar[] {
  return [
    {
      label: "Storefront campaigns",
      active: status.campaignsScheduled > 0,
    },
    { label: "SEO & content", active: status.seoApplied + status.faqs > 0 },
    { label: "Recommendations", active: status.occasions > 0 },
    { label: "Promotions", active: status.promotions + status.bundles > 0 },
    { label: "Audiences", active: status.audiences > 0 },
  ];
}

/**
 * One number for "how ready is this store for the next season": half from
 * the AI prep checklist, half from which of the five revenue pillars have
 * at least one live setup.
 */
export function readinessScore(
  status: SeasonStatus,
  checklistTotal: number,
  checklistDone: number,
): number {
  const checklistPart = checklistTotal
    ? (checklistDone / checklistTotal) * 50
    : 0;
  const pillars = seasonPillars(status);
  const pillarPart = pillars.filter((pillar) => pillar.active).length * 10;
  return Math.round(checklistPart + pillarPart);
}

type Props = {
  status: SeasonStatus;
  checklistTotal: number;
  checklistDone: number;
};

export default function ReadinessCard({
  status,
  checklistTotal,
  checklistDone,
}: Props) {
  const score = readinessScore(status, checklistTotal, checklistDone);
  const pillars = seasonPillars(status);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Season readiness
          </Text>
          <Text as="span" variant="headingLg">
            {score}%
          </Text>
        </InlineStack>
        <ProgressBar
          progress={score}
          size="small"
          tone={score >= 70 ? "success" : "primary"}
        />
        <InlineStack gap="200" wrap>
          {pillars.map((pillar) => (
            <Badge
              key={pillar.label}
              tone={pillar.active ? "success" : undefined}
            >
              {pillar.label}
            </Badge>
          ))}
        </InlineStack>
        <Text as="p" variant="bodySm" tone="subdued">
          Half of your score comes from the prep checklist below, half from
          having campaigns, SEO, recommendations, promotions, and audiences
          set up.
        </Text>
      </BlockStack>
    </Card>
  );
}

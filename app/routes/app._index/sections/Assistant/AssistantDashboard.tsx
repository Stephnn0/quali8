import { useFetcher } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineStack,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
import type {
  AssistantBrief,
  BriefChecklistItem,
  BriefOccasion,
} from "app/services/assistant/briefSchema";
import styles from "./styles.module.css";

const ART_GRADIENTS = [
  ["#e6def2", "#b9a4d6"],
  ["#f2d8e2", "#dba8bd"],
  ["#f0e2c0", "#dbbf7e"],
  ["#dcead8", "#a8c49b"],
  ["#dde4f2", "#9fb2d8"],
  ["#f2e0d8", "#d8a894"],
];

const CATEGORY_LABEL: Record<BriefChecklistItem["category"], string> = {
  store: "Storefront",
  inventory: "Inventory",
  marketing: "Marketing",
  app: "In Quali8",
};

const dateBadge = (isoDate: string) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function daysAway(isoDate: string): number {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.parse(isoDate + "T00:00:00Z");
  return Math.max(0, Math.round((target - today) / (24 * 60 * 60 * 1000)));
}

function OccasionCard({ occasion, index }: { occasion: BriefOccasion; index: number }) {
  const [from, to] = ART_GRADIENTS[index % ART_GRADIENTS.length];
  const days = daysAway(occasion.date);

  return (
    <article className={styles.occasionCard}>
      <div
        className={styles.occasionArt}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <span className={styles.occasionDate}>{dateBadge(occasion.date)}</span>
      </div>
      <div className={styles.occasionBody}>
        <h3 className={styles.occasionName}>{occasion.name}</h3>
        <span className={styles.occasionDays}>
          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
        </span>
        <p className={styles.occasionWhy}>{occasion.whyItMatters}</p>
        <div className={styles.occasionAction}>{occasion.suggestedAction}</div>
      </div>
    </article>
  );
}

type Props = {
  nicheLabel: string;
  country: string | null;
  brief: AssistantBrief;
  source: "AI" | "FALLBACK";
  generatedAt: string;
  checklistDone: string[];
};

export default function AssistantDashboard({
  nicheLabel,
  country,
  brief,
  source,
  generatedAt,
  checklistDone,
}: Props) {
  const refreshFetcher = useFetcher();
  const taskFetcher = useFetcher();
  const refreshing = refreshFetcher.state !== "idle";

  const doneSet = new Set(checklistDone);
  const doneCount = brief.checklist.filter((item) => doneSet.has(item.id)).length;

  const refresh = () =>
    refreshFetcher.submit(
      { body: JSON.stringify({ action: "refresh" }) },
      { method: "POST", encType: "multipart/form-data", action: "/api/assistant" },
    );

  const toggleTask = (id: string, done: boolean) =>
    taskFetcher.submit(
      { body: JSON.stringify({ action: "toggle-task", id, done }) },
      { method: "POST", encType: "multipart/form-data", action: "/api/assistant" },
    );

  return (
    <BlockStack gap="500">
      <div className={styles.banner}>
        <InlineStack align="space-between" blockAlign="start" gap="300">
          <div>
            <p className={styles.bannerEyebrow}>Quali8 Assistant</p>
            <h1 className={styles.bannerTitle}>
              Your {nicheLabel.toLowerCase()} assistant
            </h1>
            <p className={styles.bannerText}>{brief.insight}</p>
            <div className={styles.bannerMeta}>
              <span className={styles.pill}>{nicheLabel}</span>
              {country ? <span className={styles.pill}>{country}</span> : null}
              <span className={styles.pill}>
                {source === "AI" ? "AI brief" : "Curated brief"} ·{" "}
                {new Date(generatedAt).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          <Button
            icon={RefreshIcon}
            onClick={refresh}
            loading={refreshing}
            accessibilityLabel="Refresh the brief"
          >
            Refresh
          </Button>
        </InlineStack>
      </div>

      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Coming up for your shop
        </Text>
        <div className={styles.rail}>
          {brief.occasions.map((occasion, index) => (
            <OccasionCard
              key={`${occasion.name}-${occasion.date}`}
              occasion={occasion}
              index={index}
            />
          ))}
        </div>
      </BlockStack>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Get your shop ready
            </Text>
            <Text as="span" tone="subdued" variant="bodySm">
              {doneCount} of {brief.checklist.length} done
            </Text>
          </InlineStack>
          <ProgressBar
            progress={
              brief.checklist.length
                ? Math.round((doneCount / brief.checklist.length) * 100)
                : 0
            }
            size="small"
            tone="primary"
          />
          <BlockStack gap="300">
            {brief.checklist.map((item) => (
              <InlineStack key={item.id} gap="300" wrap={false} blockAlign="start">
                <Checkbox
                  label=""
                  labelHidden
                  checked={doneSet.has(item.id)}
                  onChange={(checked) => toggleTask(item.id, checked)}
                />
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text
                      as="p"
                      fontWeight="medium"
                      textDecorationLine={
                        doneSet.has(item.id) ? "line-through" : undefined
                      }
                    >
                      {item.title}
                    </Text>
                    <Badge size="small">{CATEGORY_LABEL[item.category]}</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {item.description}
                  </Text>
                </BlockStack>
              </InlineStack>
            ))}
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

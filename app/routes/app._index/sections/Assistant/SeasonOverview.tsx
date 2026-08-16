import { BlockStack, Button, InlineStack, Text } from "@shopify/polaris";
import { APP } from "app/constants/app.constants";
import { APP_PLANS } from "app/constants/plans";
import type { CoreDate } from "app/services/assistant/coreDates";
import styles from "./styles.module.css";

const PRICING_PAGE_URL = `shopify://admin/charges/${APP.APP_HANDLE}/pricing_plans`;

const ART_GRADIENTS = [
  ["#e6def2", "#b9a4d6"],
  ["#f2d8e2", "#dba8bd"],
  ["#f0e2c0", "#dbbf7e"],
  ["#dcead8", "#a8c49b"],
  ["#dde4f2", "#9fb2d8"],
  ["#f2e0d8", "#d8a894"],
];

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

type Props = {
  upcoming: CoreDate[];
};

/**
 * The seasonal section of the Free/Pro dashboard, below the feature library:
 * upcoming commerce dates plus the Advance upsell. The feature grid above
 * covers quick actions, so this section stays focused on the calendar.
 */
export default function SeasonOverview({ upcoming }: Props) {
  const next = upcoming[0];

  return (
    <BlockStack gap="500">
      {upcoming.length ? (
        <BlockStack gap="300">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Your next sales seasons
            </Text>
            {next ? (
              <Text as="p" tone="subdued">
                {`${next.name} is ${
                  daysAway(next.date) === 0
                    ? "today"
                    : `in ${daysAway(next.date)} days`
                } — is your store ready?`}
              </Text>
            ) : null}
          </BlockStack>
          <div className={styles.rail}>
            {upcoming.map((core, index) => {
              const [from, to] = ART_GRADIENTS[index % ART_GRADIENTS.length];
              const days = daysAway(core.date);
              return (
                <article key={`${core.name}-${core.date}`} className={styles.occasionCard}>
                  <div
                    className={styles.occasionArt}
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    <span className={styles.occasionDate}>{dateBadge(core.date)}</span>
                  </div>
                  <div className={styles.occasionBody}>
                    <h3 className={styles.occasionName}>{core.name}</h3>
                    <span className={styles.occasionDays}>
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </BlockStack>
      ) : null}

      <div className={styles.banner}>
        <p className={styles.bannerEyebrow}>
          {`Upgrade to ${APP_PLANS.ADVANCE.name}`}
        </p>
        <h1 className={styles.bannerTitle}>
          Unlock the full Season Command Center
        </h1>
        <p className={styles.bannerText}>
          OneApp prepares your store for the seasons that drive revenue: a
          sales calendar tuned to your niche and country, one-click
          storefront campaigns (announcement bar, hero, popup, menu),
          AI-optimized SEO for every date, and a readiness plan that tells
          you exactly what to do next.
        </p>
        <div className={styles.upsellGrid}>
          <div className={styles.upsellItem}>
            <p className={styles.upsellItemTitle}>Sales Calendar</p>
            <p className={styles.upsellItemText}>
              The dates that matter for your niche — with why they matter and
              a prep plan for each.
            </p>
          </div>
          <div className={styles.upsellItem}>
            <p className={styles.upsellItemTitle}>Storefront campaigns</p>
            <p className={styles.upsellItemText}>
              Schedule an announcement bar, hero banner, subscribe popup, and
              menu link — they go live and come down on their own.
            </p>
          </div>
          <div className={styles.upsellItem}>
            <p className={styles.upsellItemTitle}>AI SEO Optimizer</p>
            <p className={styles.upsellItemText}>
              Occasion-optimized meta titles and descriptions, collection
              FAQs, and a per-date SEO prep list.
            </p>
          </div>
        </div>
        <InlineStack gap="300" blockAlign="center">
          <div style={{ marginTop: "1.25rem" }}>
            <Button variant="primary" url={PRICING_PAGE_URL}>
              {`Try ${APP_PLANS.ADVANCE.name} free for ${APP_PLANS.ADVANCE.trialDays} days`}
            </Button>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <span className={styles.pill}>$25/month · cancel anytime</span>
          </div>
        </InlineStack>
      </div>
    </BlockStack>
  );
}

import { useNavigate } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { APP } from "app/constants/app.constants";
import { APP_PLANS } from "app/constants/plans";
import type { CoreDate } from "app/services/assistant/coreDates";
import type { OverviewEntitlements } from "../../route";
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
  counts: {
    audiences: number;
    promotions: number;
    bundles: number;
    occasions: number;
  };
  entitlements: OverviewEntitlements;
};

/**
 * The home page for Free/Pro merchants: the same "sales season" framing as
 * the Advance dashboard — upcoming commerce dates, quick actions for the
 * features their plan includes — with the AI command center as the upsell.
 */
export default function SeasonOverview({ upcoming, counts, entitlements }: Props) {
  const navigate = useNavigate();
  const next = upcoming[0];

  return (
    <BlockStack gap="500">
      <div className={styles.banner}>
        <p className={styles.bannerEyebrow}>Season Command Center</p>
        <h1 className={styles.bannerTitle}>
          {next
            ? `${next.name} is ${
                daysAway(next.date) === 0
                  ? "today"
                  : `in ${daysAway(next.date)} days`
              } — is your store ready?`
            : "Get your store ready for the next sales season"}
        </h1>
        <p className={styles.bannerText}>
          Quali8 prepares your store for the seasons that drive revenue:
          plan each date, launch storefront campaigns, tune your SEO, and
          recommend the right products to the right shoppers.
        </p>
      </div>

      {upcoming.length ? (
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Your next sales seasons
          </Text>
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

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Audiences
              </Text>
              <Badge tone={counts.audiences ? "success" : undefined}>
                {counts.audiences ? `${counts.audiences} active` : "Not started"}
              </Badge>
            </InlineStack>
            <Text as="p" tone="subdued">
              Group customers by behavior — gift buyers, VIPs, first-timers —
              and target them with seasonal promotions.
            </Text>
            <div>
              <Button onClick={() => navigate("/app/qualifiers")}>
                {counts.audiences ? "Manage audiences" : "Create your first audience"}
              </Button>
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Promotions
              </Text>
              <Badge
                tone={counts.promotions + counts.bundles ? "success" : undefined}
              >
                {counts.promotions + counts.bundles
                  ? `${counts.promotions + counts.bundles} active`
                  : entitlements.hasShippingDiscounts
                    ? "Not started"
                    : "Pro"}
              </Badge>
            </InlineStack>
            <Text as="p" tone="subdued">
              Shipping discounts and product bundles that reward your best
              audiences during peak seasons.
            </Text>
            <div>
              <Button onClick={() => navigate("/app/actions")}>
                {entitlements.hasShippingDiscounts
                  ? "Set up promotions"
                  : "See promotions"}
              </Button>
            </div>
          </BlockStack>
        </Card>
      </InlineGrid>

      <div className={styles.banner}>
        <p className={styles.bannerEyebrow}>
          {`Upgrade to ${APP_PLANS.ADVANCE.name}`}
        </p>
        <h1 className={styles.bannerTitle}>
          Unlock the full Season Command Center
        </h1>
        <p className={styles.bannerText}>
          A sales calendar tuned to your niche and country, one-click
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

import { BlockStack, Button, InlineStack } from "@shopify/polaris";
import { APP } from "app/constants/app.constants";
import { APP_PLANS } from "app/constants/plans";
import styles from "./styles.module.css";

const PRICING_PAGE_URL = `shopify://admin/charges/${APP.APP_HANDLE}/pricing_plans`;

/** The dashboard for Free/Pro merchants: the assistant pitch + upgrade. */
export default function AssistantUpsell() {
  return (
    <div className={styles.banner}>
      <p className={styles.bannerEyebrow}>Quali8 Assistant</p>
      <h1 className={styles.bannerTitle}>
        An assistant that gets your shop ready for what&rsquo;s next
      </h1>
      <p className={styles.bannerText}>
        Tell it your niche once and it keeps watch: the occasions coming up
        for your business and country, what to prepare in your store, and the
        promotions worth running — refreshed every week.
      </p>

      <div className={styles.upsellGrid}>
        <div className={styles.upsellItem}>
          <p className={styles.upsellItemTitle}>Occasion radar</p>
          <p className={styles.upsellItemText}>
            The dates that matter for your niche, with why they matter and
            what to do about each one.
          </p>
        </div>
        <div className={styles.upsellItem}>
          <p className={styles.upsellItemTitle}>Readiness checklist</p>
          <p className={styles.upsellItemText}>
            A store-prep to-do list generated for your business — storefront,
            inventory, marketing, and app setup.
          </p>
        </div>
        <div className={styles.upsellItem}>
          <p className={styles.upsellItemTitle}>Tuned to your shop</p>
          <p className={styles.upsellItemText}>
            Built from your catalog, your country, and what you&rsquo;ve
            already set up in Quali8.
          </p>
        </div>
      </div>

      <BlockStack gap="200">
        <InlineStack gap="300" blockAlign="center">
          <div style={{ marginTop: "1.25rem" }}>
            <Button variant="primary" url={PRICING_PAGE_URL}>
              {`Upgrade to ${APP_PLANS.ADVANCE.name}`}
            </Button>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <span className={styles.pill}>
              {`$25/month · ${APP_PLANS.ADVANCE.trialDays}-day free trial`}
            </span>
          </div>
        </InlineStack>
      </BlockStack>
    </div>
  );
}

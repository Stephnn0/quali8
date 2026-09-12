import type { LoaderFunctionArgs } from "react-router";
import { BlockStack, Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import {
  FeatureGrid,
  ONEAPP_FEATURES,
  RequestFeatureBand,
} from "app/components/OneApp";
import styles from "app/components/OneApp/oneapp.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <Page>
      <BlockStack gap="500">
        <BlockStack gap="300">
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Your features</h2>
            <span className={styles.sectionHint}>
              {String(ONEAPP_FEATURES.length).padStart(2, "0")} and growing
            </span>
          </div>
          <FeatureGrid />
        </BlockStack>

        <RequestFeatureBand />
      </BlockStack>
    </Page>
  );
}

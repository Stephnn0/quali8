import { BlockStack, Button, Card, InlineGrid, Page, Text } from "@shopify/polaris";
import {
  NEXT_FEATURE_NUMBER,
  REQUEST_FEATURE_EMAIL,
  requestFeatureMailto,
} from "app/components/OneApp";
import styles from "app/components/OneApp/oneapp.module.css";

/**
 * UI-only page: the "Request a feature" entry point from the nav and
 * dashboard. There is no request backend — requests arrive by email, the
 * app's existing support channel.
 */
export default function RequestFeature() {
  return (
    <Page>
      <header className={styles.pageHeader}>
        <span className={styles.pageHeaderNumber} aria-hidden>
          {NEXT_FEATURE_NUMBER}
        </span>
        <div className={styles.pageHeaderBody}>
          <p className={styles.pageHeaderEyebrow}>
            OneApp — reserved for your store
          </p>
          <h1 className={styles.pageHeaderTitle}>Request a feature</h1>
          <p className={styles.pageHeaderTagline}>
            Tell us what your store needs. If it fits OneApp, we build it and
            it ships straight into your library.
          </p>
        </div>
        <div className={styles.pageHeaderActions}>
          <Button variant="primary" url={requestFeatureMailto()} target="_top">
            Email your request
          </Button>
        </div>
      </header>

      <BlockStack gap="400">
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                1. Describe it
              </Text>
              <Text as="p" tone="subdued">
                What should the feature do, and where should it show up — your
                storefront, checkout, or the admin? A sentence or two is
                enough.
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                2. We scope it
              </Text>
              <Text as="p" tone="subdued">
                We reply with what we can build and when. Requests that
                replace a separate paid app go to the top of the list.
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                3. It ships to your library
              </Text>
              <Text as="p" tone="subdued">
                The feature lands on your dashboard with the next number in
                the library — no new app to install or pay for.
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingSm">
              Prefer plain email?
            </Text>
            <Text as="p" tone="subdued">
              Write to {REQUEST_FEATURE_EMAIL} with the subject
              &ldquo;OneApp feature request&rdquo;. Screenshots of the app
              you&rsquo;re replacing help us move faster.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

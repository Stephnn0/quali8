import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Badge,
  BlockStack,
  Card,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import { getCategoryFeatures } from "app/components/OneApp";
import styles from "app/components/OneApp/oneapp.module.css";

/**
 * Campaigns: the future hub that controls every seasonal feature from one
 * place (turn them on and off per sales date, see what is live). This is
 * the Sales Calendar's new home; until it ships, the tab shows what is
 * coming. The seasonal features themselves are usable today from their own
 * pages under Seasonal Marketing.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function CampaignsComingSoon() {
  const seasonal = getCategoryFeatures("seasonal-marketing");

  return (
    <Page>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderBody}>
          <p className={styles.pageHeaderEyebrow}>OneApp hub</p>
          <h1 className={styles.pageHeaderTitle}>Campaigns</h1>
          <p className={styles.pageHeaderTagline}>
            One place to run every sales date: switch features on and off,
            see what is live, and launch a whole campaign at once.
          </p>
        </div>
        <div className={styles.pageHeaderActions}>
          <Badge tone="attention">Coming soon</Badge>
        </div>
      </header>

      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              What Campaigns will do
            </Text>
            <Text as="p" tone="subdued">
              Pick a sales date, then activate or deactivate each seasonal
              feature for it from a single screen: the announcement bar, hero,
              menu item, subscribe popup, SEO changes, and prep lists. Until
              this hub ships, every one of those features has its own page
              under Seasonal Marketing.
            </Text>
          </BlockStack>
        </Card>

        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
          {seasonal.map((feature) => (
            <Card key={feature.key}>
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="bodySm" tone="subdued">
                    {feature.number}
                  </Text>
                  <Text as="h3" variant="headingSm">
                    {feature.name}
                  </Text>
                </InlineStack>
                <Text as="p" tone="subdued">
                  {feature.tagline}
                </Text>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);

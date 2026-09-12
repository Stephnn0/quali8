import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { FeatureHeader } from "app/components/OneApp";
import {
  FEATURE_PAGES,
  isFeaturePageKey,
  type FeaturePageKey,
} from "app/components/Seasonal/featurePages";
import AnnouncementScheduler from "app/components/Seasonal/AnnouncementScheduler";
import HeroScheduler from "app/components/Seasonal/HeroScheduler";
import PopupScheduler from "app/components/Seasonal/PopupScheduler";
import SeoOptimizer from "app/components/Seasonal/SeoOptimizer";
import {
  loadShopFeatureConfig,
  runShopFeatureAction,
  shopFeatureActionSchema,
  type ShopFeatureConfig,
} from "app/services/seasonal/shopFeatureConfig.server";

/**
 * One feature, one page: the merchant lands straight on the editor for the
 * shop's single announcement bar / hero / popup, or on the SEO optimizer.
 * The schedulers post their mutations back to this route.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  const featureKey = params.feature;
  if (!isFeaturePageKey(featureKey)) {
    throw new Response("Feature not found", { status: 404 });
  }

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const config = await loadShopFeatureConfig(db, session.shop);
  return { featureKey, config };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  if (!isFeaturePageKey(params.feature)) {
    throw new Response("Feature not found", { status: 404 });
  }

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = shopFeatureActionSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    return await runShopFeatureAction({ db, shop: session.shop, body });
  } catch (error) {
    console.error("Feature page action error:", error);
    return {
      code: "error",
      errors: [{ message: "Something went wrong. Try again." }],
    };
  }
}

function FeatureEditor({
  featureKey,
  config,
}: {
  featureKey: FeaturePageKey;
  config: ShopFeatureConfig;
}) {
  switch (featureKey) {
    case "smart-announcements":
      return <AnnouncementScheduler announcementBar={config.announcementBar} />;
    case "seasonal-hero":
      return <HeroScheduler hero={config.hero} />;
    case "subscribe-boost":
      return <PopupScheduler popup={config.popup} />;
    case "seo-ai":
      return (
        <SeoOptimizer specialDateId={null} appliedActions={config.seoActions} />
      );
  }
}

export default function FeaturePage() {
  const { featureKey, config } = useLoaderData<typeof loader>();
  const feature = FEATURE_PAGES[featureKey];

  return (
    <Page>
      <FeatureHeader featureKey={featureKey} />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  {feature.configTitle}
                </Text>
                <Text as="p" tone="subdued">
                  {feature.configHelp}
                </Text>
              </BlockStack>
              <FeatureEditor featureKey={featureKey} config={config} />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);

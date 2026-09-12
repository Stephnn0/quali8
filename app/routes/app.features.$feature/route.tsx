import type { ReactNode } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { BlockStack, Button, Card, Layout, Page, Text } from "@shopify/polaris";
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
 * shop's single announcement bar or popup, or on the SEO optimizer.
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

type Section = { title: string; help: string; node: ReactNode };

function DeliveryLink({ enabled, zones }: { enabled: boolean; zones: number }) {
  const navigate = useNavigate();
  return (
    <BlockStack gap="200">
      <Text as="p" tone="subdued">
        Zip checker {enabled ? "on" : "off"} · {zones} {zones === 1 ? "zone" : "zones"}
      </Text>
      <div>
        <Button onClick={() => navigate("/app/delivery")}>Manage delivery zones</Button>
      </div>
    </BlockStack>
  );
}

/** The cards on a feature page: the primary editor, plus extras. */
function sectionsFor(featureKey: FeaturePageKey, config: ShopFeatureConfig): Section[] {
  const feature = FEATURE_PAGES[featureKey];
  switch (featureKey) {
    case "smart-announcements":
      return [
        {
          title: feature.configTitle,
          help: feature.configHelp,
          node: <AnnouncementScheduler announcementBar={config.announcementBar} />,
        },
        {
          title: "Zip code delivery check",
          help:
            "The bar can also let shoppers check whether you deliver to their zip code. The zones, prices, and the on/off switch live on the Delivery page.",
          node: <DeliveryLink enabled={config.deliveryCheckEnabled} zones={config.deliveryZoneCount} />,
        },
      ];
    case "subscribe-boost":
      return [
        {
          title: feature.configTitle,
          help: feature.configHelp,
          node: <PopupScheduler popup={config.popup} />,
        },
      ];
    case "seo-ai":
      return [
        {
          title: feature.configTitle,
          help: feature.configHelp,
          node: <SeoOptimizer specialDateId={null} appliedActions={config.seoActions} />,
        },
      ];
  }
}

export default function FeaturePage() {
  const { featureKey, config } = useLoaderData<typeof loader>();

  return (
    <Page>
      <FeatureHeader featureKey={featureKey} />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {sectionsFor(featureKey, config).map((section) => (
              <Card key={section.title}>
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      {section.title}
                    </Text>
                    <Text as="p" tone="subdued">
                      {section.help}
                    </Text>
                  </BlockStack>
                  {section.node}
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
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

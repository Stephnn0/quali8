import type { ReactNode } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { Banner, BlockStack, Button, Card, Layout, Page, Text } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { FeatureHeader } from "app/components/OneApp";
import {
  FEATURE_PAGES,
  FEATURE_PAGE_GATES,
  isFeaturePageKey,
  type FeaturePageKey,
} from "app/components/Seasonal/featurePages";
import { APP } from "app/constants/app.constants";
import AnnouncementScheduler from "app/components/Seasonal/AnnouncementScheduler";
import PopupScheduler from "app/components/Seasonal/PopupScheduler";
import SeoOptimizer from "app/components/Seasonal/SeoOptimizer";
import SubscriberAnalytics from "app/components/Subscribe/SubscriberAnalytics";
import {
  loadSubscribeAnalytics,
  signupLimitStatus,
  type SignupLimitStatus,
  type SubscribeAnalytics as SubscribeAnalyticsData,
} from "app/services/subscribe/subscribers.server";
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

  await gatekeepRoute({ authAdminContext }, FEATURE_PAGE_GATES[featureKey], "redirect");

  const config = await loadShopFeatureConfig(db, session.shop);

  // The analytics must never take the editor down with them (for example
  // while a database migration is still pending on a fresh deploy).
  let subscribers: SubscribeAnalyticsData | null = null;
  let subscribersError: string | null = null;
  let signupLimit: SignupLimitStatus | null = null;
  if (featureKey === "subscribe-boost") {
    try {
      [subscribers, signupLimit] = await Promise.all([
        loadSubscribeAnalytics(db, session.shop, session.scope),
        signupLimitStatus(db, session.shop),
      ]);
    } catch (error) {
      console.error("Subscribe analytics failed to load:", error); // eslint-disable-line no-console
      subscribersError = error instanceof Error ? error.message : String(error);
    }
  }
  return { featureKey, config, subscribers, subscribersError, signupLimit };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  if (!isFeaturePageKey(params.feature)) {
    throw new Response("Feature not found", { status: 404 });
  }

  try {
    await gatekeepRoute({ authAdminContext }, FEATURE_PAGE_GATES[params.feature], "throw");

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

/** The Free plan's monthly signup cap: how much is left, or that it is used up. */
function SignupLimitBanner({ status }: { status: SignupLimitStatus }) {
  if (status.limit === null) return null;
  const upgrade = { content: "Upgrade to Advance", onAction: APP.OPEN_APP_PLANS_PAGE };
  if (status.reached) {
    return (
      <Banner tone="warning" title="The popup is paused until next month" action={upgrade}>
        <p>
          Your {status.planName} plan includes {status.limit} signups a month and they
          are all used. The popup stays hidden on the storefront until the 1st, or
          right away on Advance, which has no cap.
        </p>
      </Banner>
    );
  }
  return (
    <Banner tone="info" action={upgrade}>
      <p>
        {status.used} of {status.limit} signups used this month on the {status.planName}{" "}
        plan. The popup pauses at {status.limit}; Advance has no cap.
      </p>
    </Banner>
  );
}

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
function sectionsFor(
  featureKey: FeaturePageKey,
  config: ShopFeatureConfig,
  subscribers: SubscribeAnalyticsData | null,
  subscribersError: string | null,
  signupLimit: SignupLimitStatus | null,
): Section[] {
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
          node: (
            <BlockStack gap="400">
              {signupLimit ? <SignupLimitBanner status={signupLimit} /> : null}
              <PopupScheduler popup={config.popup} />
            </BlockStack>
          ),
        },
        {
          title: "Subscribers",
          help:
            "Everyone who subscribed through the popup. They are saved in Shopify customers with marketing consent and the tags from the theme block.",
          node: subscribers ? (
            <SubscriberAnalytics analytics={subscribers} />
          ) : (
            <Banner tone="critical" title="Subscriber analytics couldn't be loaded">
              <p>
                {subscribersError ?? "Unknown error"}. If this mentions a missing table,
                the database migration has not run on this server yet: run
                <code> npx prisma migrate deploy </code>
                against it (the server does this on start via <code>npm run setup</code>).
              </p>
            </Banner>
          ),
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
  const { featureKey, config, subscribers, subscribersError, signupLimit } =
    useLoaderData<typeof loader>();

  return (
    <Page>
      <FeatureHeader featureKey={featureKey} />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {sectionsFor(featureKey, config, subscribers, subscribersError, signupLimit).map((section) => (
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

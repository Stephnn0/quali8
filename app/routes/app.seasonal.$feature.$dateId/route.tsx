import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { FeatureEyebrow } from "app/components/OneApp";
import {
  SEASONAL_FEATURES,
  isSeasonalFeatureKey,
  seasonalFeaturePath,
  type SeasonalFeatureKey,
} from "app/components/Seasonal/seasonalFeatures";
import { daysAway } from "app/components/Seasonal/dates";
import type { SpecialDateDetail } from "app/components/Seasonal/types";
import AnnouncementScheduler from "app/components/Seasonal/AnnouncementScheduler";
import HeroScheduler from "app/components/Seasonal/HeroScheduler";
import MenuScheduler from "app/components/Seasonal/MenuScheduler";
import PopupScheduler from "app/components/Seasonal/PopupScheduler";
import SeoOptimizer from "app/components/Seasonal/SeoOptimizer";
import TodoBoard from "app/components/Seasonal/TodoBoard";
import {
  loadSpecialDateDetail,
  runSpecialDateAction,
  specialDateActionSchema,
} from "app/services/seasonal/specialDateDetail.server";

/**
 * One seasonal feature on one sales date. The schedulers post their
 * mutations back to this route, so the date in the URL is the date they
 * edit.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  const featureKey = params.feature;
  if (!isSeasonalFeatureKey(featureKey)) {
    throw new Response("Feature not found", { status: 404 });
  }

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const detail = await loadSpecialDateDetail(
    db,
    session.shop,
    Number(params.dateId),
  );
  return { featureKey, detail };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  if (!isSeasonalFeatureKey(params.feature)) {
    throw new Response("Feature not found", { status: 404 });
  }

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = specialDateActionSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    return await runSpecialDateAction({
      db,
      graphql: admin.graphql,
      shop: session.shop,
      specialDateId: Number(params.dateId),
      body,
    });
  } catch (error) {
    console.error("Seasonal feature action error:", error);
    return {
      code: "error",
      errors: [{ message: "Something went wrong. Try again." }],
    };
  }
}

function FeatureEditor({
  featureKey,
  detail,
}: {
  featureKey: SeasonalFeatureKey;
  detail: SpecialDateDetail;
}) {
  const { specialDate } = detail;
  switch (featureKey) {
    case "smart-announcements":
      return (
        <AnnouncementScheduler
          specialDateName={specialDate.name}
          specialDateDate={specialDate.date}
          announcementBar={detail.announcementBar}
        />
      );
    case "seasonal-hero":
      return (
        <HeroScheduler
          specialDateName={specialDate.name}
          specialDateDate={specialDate.date}
          hero={detail.hero}
        />
      );
    case "smart-menu":
      return (
        <MenuScheduler
          specialDateName={specialDate.name}
          specialDateDate={specialDate.date}
          menuItem={detail.menuItem}
        />
      );
    case "subscribe-boost":
      return (
        <PopupScheduler
          specialDateName={specialDate.name}
          specialDateDate={specialDate.date}
          popup={detail.popup}
        />
      );
    case "seo-ai":
      return (
        <SeoOptimizer
          specialDateId={specialDate.id}
          specialDateName={specialDate.name}
          appliedActions={detail.seoActions}
        />
      );
    case "seo-prep-list":
      return <TodoBoard todos={detail.todos} kinds={["SEO"]} />;
    case "marketing-playbook":
      return (
        <TodoBoard todos={detail.todos} kinds={["MARKETING", "GENERAL"]} />
      );
  }
}

export default function SeasonalFeatureDate() {
  const { featureKey, detail } = useLoaderData<typeof loader>();
  const feature = SEASONAL_FEATURES[featureKey];
  const navigate = useNavigate();
  const back = () => navigate(seasonalFeaturePath(featureKey));

  if (!detail) {
    return (
      <Page title={feature.configTitle} backAction={{ onAction: back }}>
        <Text as="p">This sales date no longer exists.</Text>
      </Page>
    );
  }

  const { specialDate } = detail;
  const days = daysAway(specialDate.date);

  return (
    <Page
      title={specialDate.name}
      subtitle={specialDate.whyItMatters ?? undefined}
      backAction={{ onAction: back }}
      titleMetadata={
        <InlineStack gap="200">
          <FeatureEyebrow featureKey={featureKey} />
          <Badge tone="attention">
            {days === 0 ? "Today" : `In ${days} days`}
          </Badge>
          <Badge tone={specialDate.source === "AI" ? "info" : undefined}>
            {specialDate.source === "AI" ? "Assistant" : "Yours"}
          </Badge>
        </InlineStack>
      }
    >
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
              <FeatureEditor featureKey={featureKey} detail={detail} />
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

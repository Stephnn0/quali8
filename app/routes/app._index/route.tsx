import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { BlockStack, FooterHelp, Link, Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopifySubscriptionModel } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { getProductSample } from "app/models/shopify.server/assistant";
import { inferNiche } from "app/services/assistant/inferNiche.server";
import {
  getOrGenerateBrief,
  type BriefRecord,
} from "app/services/assistant/brief.server";
import type { AssistantBrief } from "app/services/assistant/briefSchema";
import AssistantUpsell from "./sections/Assistant/AssistantUpsell";
import OnboardingCard from "./sections/Assistant/OnboardingCard";
import AssistantDashboard from "./sections/Assistant/AssistantDashboard";

type LoaderData =
  | { state: "upsell" }
  | { state: "onboarding"; suggestedNiche: string; suggestedCountry: string | null }
  | {
      state: "ready";
      nicheLabel: string;
      country: string | null;
      brief: AssistantBrief;
      source: "AI" | "FALLBACK";
      generatedAt: string;
      checklistDone: string[];
    };

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<LoaderData> => {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  // The assistant is the dashboard — Advance-only. Others see the pitch.
  const subscription = await shopifySubscriptionModel.findActiveSubscription(
    db,
    authAdminContext,
  );
  if (!subscription?.recurringPlan?.hasAssistant) {
    return { state: "upsell" };
  }

  const profile = await db.storeProfile.findUnique({
    where: { shop: session.shop },
  });

  if (!profile) {
    // One-step onboarding: infer the niche, prefill the country
    const [shopData, sample] = await Promise.all([
      db.shopifyShopData.findFirst({
        where: { shopifyStore: { shop: session.shop } },
        select: { country: true },
      }),
      getProductSample(admin.graphql).catch(() => ({
        productCount: 0,
        text: "",
      })),
    ]);
    const suggestedNiche = await inferNiche(sample.text, { db, shop: session.shop });
    return {
      state: "onboarding",
      suggestedNiche,
      suggestedCountry: shopData?.country ?? null,
    };
  }

  // Store facts ground the AI checklist in what's actually configured
  const [qualifiers, promotions, bundles, occasions, sample] =
    await Promise.all([
      db.qualifiers.count({ where: { shop: session.shop } }),
      db.shippingDiscountAction.count({ where: { shop: session.shop } }),
      db.bundle.count({ where: { shop: session.shop } }),
      db.occasion.count({ where: { shop: session.shop } }),
      getProductSample(admin.graphql, 1).catch(() => ({
        productCount: 0,
        text: "",
      })),
    ]);

  let record: BriefRecord;
  try {
    record = await getOrGenerateBrief(
      db,
      session.shop,
      {
        niche: profile.niche,
        nicheLabel: profile.nicheLabel,
        country: profile.country,
        note: profile.note,
      },
      {
        productCount: sample.productCount,
        hasAudiences: qualifiers > 0,
        hasPromotions: promotions > 0,
        hasBundles: bundles > 0,
        hasOccasions: occasions > 0,
      },
    );
  } catch (error) {
    console.error("Brief generation failed:", error);
    return {
      state: "onboarding",
      suggestedNiche: profile.niche,
      suggestedCountry: profile.country,
    };
  }

  return {
    state: "ready",
    nicheLabel: profile.nicheLabel,
    country: profile.country,
    brief: record.brief,
    source: record.source,
    generatedAt: record.generatedAt.toISOString(),
    checklistDone: profile.checklistDone,
  };
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page>
      <BlockStack gap="500">
        {data.state === "upsell" ? <AssistantUpsell /> : null}

        {data.state === "onboarding" ? (
          <OnboardingCard
            suggestedNiche={data.suggestedNiche}
            suggestedCountry={data.suggestedCountry}
          />
        ) : null}

        {data.state === "ready" ? (
          <AssistantDashboard
            nicheLabel={data.nicheLabel}
            country={data.country}
            brief={data.brief}
            source={data.source}
            generatedAt={data.generatedAt}
            checklistDone={data.checklistDone}
          />
        ) : null}

        <FooterHelp>
          Learn more about Quali8 on the{" "}
          <Link url="https://www.8instruments.com/products" target="_blank">
            8Instruments blog
          </Link>
          . @8Instruments. All rights reserved.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}

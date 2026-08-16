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
import { getUpcomingSpecialDates } from "app/services/assistant/specialDates.server";
import type { AssistantBrief } from "app/services/assistant/briefSchema";
import { upcomingCoreDates, type CoreDate } from "app/services/assistant/coreDates";
import SeasonOverview from "./sections/Assistant/SeasonOverview";
import OnboardingCard from "./sections/Assistant/OnboardingCard";
import AssistantDashboard from "./sections/Assistant/AssistantDashboard";
import {
  FeatureGrid,
  ONEAPP_FEATURES,
  OneAppHero,
  RequestFeatureBand,
} from "app/components/OneApp";
import styles from "app/components/OneApp/oneapp.module.css";

/** Store facts that drive the readiness score and the status grid. */
export type SeasonStatus = {
  audiences: number;
  promotions: number;
  bundles: number;
  occasions: number;
  faqs: number;
  seoApplied: number;
  campaignsScheduled: number;
  specialDates: number;
};

export type OverviewEntitlements = {
  hasShippingDiscounts: boolean;
  hasBundles: boolean;
  hasRecommendations: boolean;
};

type LoaderData =
  | {
      state: "overview";
      upcoming: CoreDate[];
      counts: Pick<
        SeasonStatus,
        "audiences" | "promotions" | "bundles" | "occasions"
      >;
      entitlements: OverviewEntitlements;
    }
  | { state: "onboarding"; suggestedNiche: string; suggestedCountry: string | null }
  | {
      state: "ready";
      nicheLabel: string;
      country: string | null;
      brief: AssistantBrief;
      rail: Array<{
        specialDateId: number;
        name: string;
        date: string;
        whyItMatters: string;
        suggestedAction: string | null;
      }>;
      source: "AI" | "FALLBACK";
      generatedAt: string;
      checklistDone: string[];
      status: SeasonStatus;
    };

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<LoaderData> => {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  // The AI dashboard is Advance-only. Free/Pro still get a season overview:
  // the upcoming commerce calendar plus quick actions for what their plan
  // includes — the home page is never a bare pitch.
  const subscription = await shopifySubscriptionModel.findActiveSubscription(
    db,
    authAdminContext,
  );
  if (!subscription?.recurringPlan?.hasAssistant) {
    const [shopData, audiences, promotions, bundles, occasions] =
      await Promise.all([
        db.shopifyShopData.findFirst({
          where: { shopifyStore: { shop: session.shop } },
          select: { country: true },
        }),
        db.qualifiers.count({ where: { shop: session.shop } }),
        db.shippingDiscountAction.count({ where: { shop: session.shop } }),
        db.bundle.count({ where: { shop: session.shop } }),
        db.occasion.count({ where: { shop: session.shop } }),
      ]);
    return {
      state: "overview",
      upcoming: upcomingCoreDates(
        new Date(),
        shopData?.country ?? "US",
        120,
      ).slice(0, 6),
      counts: { audiences, promotions, bundles, occasions },
      entitlements: {
        hasShippingDiscounts: Boolean(
          subscription?.recurringPlan?.hasShippingDiscounts,
        ),
        hasBundles: Boolean(subscription?.recurringPlan?.hasBundles),
        hasRecommendations: Boolean(
          subscription?.recurringPlan?.hasRecommendations,
        ),
      },
    };
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

  // Store facts ground the AI checklist, the readiness score, and the
  // status grid in what's actually configured
  const [
    qualifiers,
    promotions,
    bundles,
    occasions,
    sample,
    faqs,
    seoApplied,
    announcementBars,
    heroes,
    popups,
    menuItems,
  ] = await Promise.all([
    db.qualifiers.count({ where: { shop: session.shop } }),
    db.shippingDiscountAction.count({ where: { shop: session.shop } }),
    db.bundle.count({ where: { shop: session.shop } }),
    db.occasion.count({ where: { shop: session.shop } }),
    getProductSample(admin.graphql, 1).catch(() => ({
      productCount: 0,
      text: "",
    })),
    db.collectionFaq.count({ where: { shop: session.shop } }),
    db.seoMetaAction.count({ where: { shop: session.shop } }),
    db.announcementBar.count({ where: { shop: session.shop, enabled: true } }),
    db.scheduledHero.count({ where: { shop: session.shop, enabled: true } }),
    db.subscribePopup.count({ where: { shop: session.shop, enabled: true } }),
    db.scheduledMenuItem.count({
      where: { shop: session.shop, enabled: true },
    }),
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

  // The rail shows managed SpecialDate rows: the brief's occasions (synced
  // at generation) enriched with suggested actions, plus merchant dates.
  const specialDates = await getUpcomingSpecialDates(db, session.shop);
  const actionByKey = new Map(
    record.brief.occasions.map((occasion) => [
      `${occasion.name}|${occasion.date}`,
      occasion.suggestedAction,
    ]),
  );
  const rail = specialDates.slice(0, 8).map((entry) => ({
    specialDateId: entry.id,
    name: entry.name,
    date: entry.date,
    whyItMatters: entry.whyItMatters ?? "",
    suggestedAction: actionByKey.get(`${entry.name}|${entry.date}`) ?? null,
  }));

  return {
    state: "ready",
    nicheLabel: profile.nicheLabel,
    country: profile.country,
    brief: record.brief,
    rail,
    source: record.source,
    generatedAt: record.generatedAt.toISOString(),
    checklistDone: profile.checklistDone,
    status: {
      audiences: qualifiers,
      promotions,
      bundles,
      occasions,
      faqs,
      seoApplied,
      campaignsScheduled: announcementBars + heroes + popups + menuItems,
      specialDates: specialDates.length,
    },
  };
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page>
      <BlockStack gap="500">
        <OneAppHero />

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

        {data.state === "overview" ? (
          <SeasonOverview upcoming={data.upcoming} />
        ) : null}

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
            rail={data.rail}
            source={data.source}
            generatedAt={data.generatedAt}
            checklistDone={data.checklistDone}
            status={data.status}
          />
        ) : null}

        <FooterHelp>
          Learn more about OneApp on the{" "}
          <Link url="https://www.8instruments.com/products" target="_blank">
            8Instruments blog
          </Link>
          . © 8Instruments. All rights reserved.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}

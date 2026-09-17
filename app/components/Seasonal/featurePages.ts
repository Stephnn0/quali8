/**
 * OneApp features that are a single shop-wide configuration edited on one
 * page (`/app/features/<key>`): no list, no per-date setup. The Sales
 * Calendar can still schedule date-specific versions of the same blocks.
 *
 * `key` doubles as the OneApp registry key and the route param.
 */
import type { GateKeepCriteria } from "app/services/subscriptions/gatekeep/types";

export const FEATURE_PAGE_KEYS = [
  "smart-announcements",
  "subscribe-boost",
  "seo-ai",
] as const;

export type FeaturePageKey = (typeof FEATURE_PAGE_KEYS)[number];

/**
 * What each page needs from the plan. Announcements and the popup are on
 * every plan (the popup with a monthly signup cap on Free); SEO AI costs an
 * AI call per use and stays on Advance.
 */
export const FEATURE_PAGE_GATES: Record<FeaturePageKey, GateKeepCriteria> = {
  "smart-announcements": { hasAnnouncements: true },
  "subscribe-boost": { hasSubscribePopup: true },
  "seo-ai": { hasAssistant: true },
};

export type FeaturePage = {
  key: FeaturePageKey;
  /** Heading of the configuration card. */
  configTitle: string;
  /** One line under that heading explaining what the merchant is editing. */
  configHelp: string;
};

export const FEATURE_PAGES: Record<FeaturePageKey, FeaturePage> = {
  "smart-announcements": {
    key: "smart-announcements",
    configTitle: "Announcement",
    configHelp:
      "A message across the top of every page with your colors, shown between the dates you choose.",
  },
  "subscribe-boost": {
    key: "subscribe-boost",
    configTitle: "Subscribe popup",
    configHelp:
      "First-time visitors subscribe and receive a discount code, shown between the dates you choose.",
  },
  "seo-ai": {
    key: "seo-ai",
    configTitle: "AI SEO Optimizer",
    configHelp:
      "Rewrite meta titles and descriptions for products and collections with AI, review, and apply.",
  },
};

export const isFeaturePageKey = (
  value: string | undefined,
): value is FeaturePageKey =>
  FEATURE_PAGE_KEYS.includes(value as FeaturePageKey);

export const featurePagePath = (key: FeaturePageKey) => `/app/features/${key}`;

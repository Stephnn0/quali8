/**
 * OneApp features that are a single shop-wide configuration edited on one
 * page (`/app/features/<key>`): no list, no per-date setup. The Sales
 * Calendar can still schedule date-specific versions of the same blocks.
 *
 * `key` doubles as the OneApp registry key and the route param.
 */
export const FEATURE_PAGE_KEYS = [
  "smart-announcements",
  "seasonal-hero",
  "subscribe-boost",
  "seo-ai",
] as const;

export type FeaturePageKey = (typeof FEATURE_PAGE_KEYS)[number];

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
    configTitle: "Announcement bar",
    configHelp:
      "A banner across your home page with your message and colors, shown between the dates you choose.",
  },
  "seasonal-hero": {
    key: "seasonal-hero",
    configTitle: "Hero section",
    configHelp:
      "A full-width homepage hero with an image, headline, and optional button, shown between the dates you choose.",
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

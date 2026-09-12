/**
 * The seasonal features that used to be cards inside a Sales Calendar date
 * and are now standalone OneApp features. Each one still configures *one
 * special date at a time* (that is how the data is stored: one announcement
 * bar, hero, popup, or menu item per date), so every feature page is a list
 * of upcoming dates that opens a per-date config page.
 *
 * `key` doubles as the OneApp registry key and the `/app/seasonal/<key>`
 * route param.
 */
export const SEASONAL_FEATURE_KEYS = [
  "smart-announcements",
  "seasonal-hero",
  "smart-menu",
  "subscribe-boost",
  "seo-ai",
  "seo-prep-list",
  "marketing-playbook",
] as const;

export type SeasonalFeatureKey = (typeof SEASONAL_FEATURE_KEYS)[number];

export type SeasonalFeature = {
  key: SeasonalFeatureKey;
  /** Heading of the per-date configuration card. */
  configTitle: string;
  /** One line under that heading explaining what the merchant is editing. */
  configHelp: string;
  /** Column heading on the date list. */
  statusHeading: string;
  /** Row button when the date has nothing configured yet. */
  setupLabel: string;
  /** Row button once the date has something configured. */
  editLabel: string;
};

export const SEASONAL_FEATURES: Record<SeasonalFeatureKey, SeasonalFeature> = {
  "smart-announcements": {
    key: "smart-announcements",
    configTitle: "Announcement bar",
    configHelp:
      "A scheduled banner across your home page with your message and colors.",
    statusHeading: "Announcement bar",
    setupLabel: "Schedule",
    editLabel: "Edit",
  },
  "seasonal-hero": {
    key: "seasonal-hero",
    configTitle: "Hero section",
    configHelp:
      "A full-width homepage hero with an image, headline, and optional button.",
    statusHeading: "Hero",
    setupLabel: "Schedule",
    editLabel: "Edit",
  },
  "smart-menu": {
    key: "smart-menu",
    configTitle: "Menu item",
    configHelp:
      "A link in your store navigation, added and removed on schedule.",
    statusHeading: "Menu item",
    setupLabel: "Schedule",
    editLabel: "Edit",
  },
  "subscribe-boost": {
    key: "subscribe-boost",
    configTitle: "Subscribe popup",
    configHelp: "First-time visitors subscribe and receive a discount code.",
    statusHeading: "Popup",
    setupLabel: "Schedule",
    editLabel: "Edit",
  },
  "seo-ai": {
    key: "seo-ai",
    configTitle: "AI SEO Optimizer",
    configHelp:
      "Rewrite meta titles and descriptions with AI, optimized for this date.",
    statusHeading: "SEO changes",
    setupLabel: "Optimize",
    editLabel: "Continue",
  },
  "seo-prep-list": {
    key: "seo-prep-list",
    configTitle: "SEO Prep List",
    configHelp:
      "Search-visibility prep for this date, suggested by your assistant.",
    statusHeading: "Prep list",
    setupLabel: "Open list",
    editLabel: "Open list",
  },
  "marketing-playbook": {
    key: "marketing-playbook",
    configTitle: "Marketing Playbook",
    configHelp: "Promotion prep: email, social, offers, and deadlines.",
    statusHeading: "Playbook",
    setupLabel: "Open playbook",
    editLabel: "Open playbook",
  },
};

export const isSeasonalFeatureKey = (
  value: string | undefined,
): value is SeasonalFeatureKey =>
  SEASONAL_FEATURE_KEYS.includes(value as SeasonalFeatureKey);

export const seasonalFeaturePath = (key: SeasonalFeatureKey, dateId?: number) =>
  dateId === undefined
    ? `/app/seasonal/${key}`
    : `/app/seasonal/${key}/${dateId}`;

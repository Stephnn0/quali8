import type { IconSource } from "@shopify/polaris";
import {
  CalendarTimeIcon,
  ChartDonutIcon,
  ChatIcon,
  ConfettiIcon,
  DeliveryIcon,
  EmailNewsletterIcon,
  MegaphoneIcon,
  PackageIcon,
  SearchIcon,
} from "@shopify/polaris-icons";
import type { GateKeepCriteria } from "app/services/subscriptions/gatekeep/types";

/**
 * The OneApp feature library. Every entry maps to an existing admin surface —
 * `to` is the route a merchant lands on to use the feature. Features 06–08
 * are configured from the Sales Calendar (09), so they share its route.
 *
 * `gate` mirrors the server-side gatekeepRoute criteria of the target route
 * so cards can show the unlocking plan without a second source of truth.
 */
export type OneAppFeature = {
  /** Two-digit index — the library is ordered and growing. */
  number: string;
  key: string;
  name: string;
  /** One line under the name, on cards and page headers. */
  tagline: string;
  icon: IconSource;
  to: string;
  /** Plan that unlocks the feature; shown only when the shop is locked out. */
  plan?: "Pro" | "Advance";
  gate?: GateKeepCriteria;
};

export const ONEAPP_FEATURES: OneAppFeature[] = [
  {
    number: "01",
    key: "smart-shipping",
    name: "Smart Shipping",
    tagline: "Shipping discounts made simple.",
    icon: DeliveryIcon,
    to: "/app/actions/discounts",
    plan: "Pro",
    gate: { hasShippingDiscounts: true },
  },
  {
    number: "02",
    key: "customer-insights",
    name: "Customer Insights",
    tagline: "Customer analytics and targeted audiences.",
    icon: ChartDonutIcon,
    to: "/app/qualifiers",
  },
  {
    number: "03",
    key: "bundle-builder",
    name: "Bundle Builder",
    tagline: "Frequently-bought-together product bundles.",
    icon: PackageIcon,
    to: "/app/bundles",
    plan: "Pro",
    gate: { hasBundles: true },
  },
  {
    number: "04",
    key: "faq-collections",
    name: "FAQ Collections",
    tagline: "AI-drafted FAQs on your collection pages.",
    icon: ChatIcon,
    to: "/app/faqs",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "05",
    key: "occasion-match",
    name: "Occasion Match",
    tagline: "Occasion recommendations with your products.",
    icon: ConfettiIcon,
    to: "/app/occasions",
    plan: "Pro",
    gate: { hasRecommendations: true },
  },
  {
    number: "06",
    key: "smart-announcements",
    name: "Smart Announcements",
    tagline: "Announcement bars timed to your sales dates.",
    icon: MegaphoneIcon,
    to: "/app/special-dates",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "07",
    key: "seo-ai",
    name: "SEO AI",
    tagline: "AI SEO for products and collections.",
    icon: SearchIcon,
    to: "/app/special-dates",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "08",
    key: "subscribe-boost",
    name: "Subscribe Boost",
    tagline: "Subscribe popups that grow your list.",
    icon: EmailNewsletterIcon,
    to: "/app/special-dates",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "09",
    key: "sales-calendar",
    name: "Sales Calendar",
    tagline: "Plan and launch every sales date from one calendar.",
    icon: CalendarTimeIcon,
    to: "/app/special-dates",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
];

/** The next open slot in the library — the "Request a feature" number. */
export const NEXT_FEATURE_NUMBER = String(ONEAPP_FEATURES.length + 1).padStart(
  2,
  "0",
);

export const getOneAppFeature = (key: string): OneAppFeature => {
  const feature = ONEAPP_FEATURES.find((entry) => entry.key === key);
  if (!feature) throw new Error(`Unknown OneApp feature: ${key}`);
  return feature;
};

export const REQUEST_FEATURE_EMAIL = "support@8instruments.com";

export const requestFeatureMailto = () =>
  `mailto:${REQUEST_FEATURE_EMAIL}?subject=${encodeURIComponent(
    "OneApp feature request",
  )}&body=${encodeURIComponent(
    "Hi OneApp team,\n\nMy store needs a feature that:\n\n(Describe what you want the feature to do, and where it should appear.)\n",
  )}`;

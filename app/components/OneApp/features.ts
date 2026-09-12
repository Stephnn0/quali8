import type { IconSource } from "@shopify/polaris";
import {
  ChartDonutIcon,
  ChatIcon,
  ConfettiIcon,
  DeliveryIcon,
  EmailNewsletterIcon,
  MagicIcon,
  MegaphoneIcon,
  PackageIcon,
  SearchIcon,
} from "@shopify/polaris-icons";
import type { GateKeepCriteria } from "app/services/subscriptions/gatekeep/types";

/**
 * OneApp organises its features into categories. Each category is a sidebar
 * entry that opens `/app/categories/<slug>`, a page of showcase cards (one per
 * feature) that navigate to the feature itself. Add a category here and it
 * appears in the nav, the dashboard, and the category route automatically.
 */
export type OneAppCategoryKey =
  | "sales-pricing"
  | "customers"
  | "content-seo"
  | "theme-extensions";

export type OneAppCategory = {
  key: OneAppCategoryKey;
  name: string;
  /** One line under the name on the category page and dashboard groups. */
  tagline: string;
};

export const ONEAPP_CATEGORIES: OneAppCategory[] = [
  {
    key: "sales-pricing",
    name: "Sales & Pricing",
    tagline: "Discounts and bundles that lift every order at checkout.",
  },
  {
    key: "customers",
    name: "Customers",
    tagline: "Know your customers, target them, and grow your list.",
  },
  {
    key: "content-seo",
    name: "Content & SEO",
    tagline: "AI-written content that helps shoppers and search engines.",
  },
  {
    key: "theme-extensions",
    name: "Theme Extensions",
    tagline: "Blocks for your storefront: gift picks, announcements, and popups.",
  },
];

export type OneAppPlan = "Free" | "Advance";

/**
 * The OneApp feature library. Every entry maps to an existing admin surface —
 * `to` is the route a merchant lands on to use the feature. Features 06–08
 * are single shop-wide configs edited on one page each at
 * `/app/features/<key>` (see `app/components/Seasonal/featurePages.ts`).
 *
 * `plan` is the lowest plan that includes the feature and is shown as a
 * banner on every card. `gate` mirrors the server-side gatekeepRoute criteria
 * of the target route so cards can tell whether the shop is locked out
 * without a second source of truth.
 */
export type OneAppFeature = {
  /** Two-digit index — the library is ordered and growing. */
  number: string;
  key: string;
  name: string;
  category: OneAppCategoryKey;
  /** One line under the name, on cards and page headers. */
  tagline: string;
  /** A short paragraph for the category showcase card. */
  description: string;
  icon: IconSource;
  /** Illustration served from `public/features/`. */
  image: string;
  to: string;
  plan: OneAppPlan;
  gate?: GateKeepCriteria;
};

export const ONEAPP_FEATURES: OneAppFeature[] = [
  {
    number: "01",
    key: "smart-shipping",
    name: "Smart Shipping",
    category: "sales-pricing",
    tagline: "Shipping discounts made simple.",
    description:
      "Give free or reduced shipping to the customers you choose — VIPs, repeat buyers, or anyone over a cart minimum — and let a Shopify Function apply it at checkout.",
    icon: DeliveryIcon,
    image: "/features/smart-shipping.svg",
    to: "/app/actions/discounts",
    plan: "Advance",
    gate: { hasShippingDiscounts: true },
  },
  {
    number: "02",
    key: "customer-insights",
    name: "Customer Insights",
    category: "customers",
    tagline: "Customer analytics and targeted audiences.",
    description:
      "Build audiences from tags, order count, spend, and more, then reuse them across every promotion you run.",
    icon: ChartDonutIcon,
    image: "/features/customer-insights.svg",
    to: "/app/qualifiers",
    plan: "Free",
  },
  {
    number: "03",
    key: "bundle-builder",
    name: "Bundle Builder",
    category: "sales-pricing",
    tagline: "Frequently-bought-together product bundles.",
    description:
      "Pair products into a bundle with its own discount, show it on the product page, and apply the price automatically when the full bundle is in the cart.",
    icon: PackageIcon,
    image: "/features/bundle-builder.svg",
    to: "/app/bundles",
    plan: "Advance",
    gate: { hasBundles: true },
  },
  {
    number: "04",
    key: "faq-collections",
    name: "FAQ Collections",
    category: "content-seo",
    tagline: "AI-drafted FAQs on your collection pages.",
    description:
      "Generate the questions shoppers actually ask about each collection, edit the answers, and publish them to the storefront in one click.",
    icon: ChatIcon,
    image: "/features/faq-collections.svg",
    to: "/app/faqs",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "05",
    key: "occasions-gifts",
    name: "Occasions + Gift Recommendations",
    category: "theme-extensions",
    tagline: "Occasion and gift picks on product pages.",
    description:
      "Create occasions, connect products or whole collections to each one, and show shoppers the right gifts for the moment on your product pages.",
    icon: ConfettiIcon,
    image: "/features/occasions-gifts.svg",
    to: "/app/occasions",
    plan: "Advance",
    gate: { hasRecommendations: true },
  },
  {
    number: "06",
    key: "smart-announcements",
    name: "Announcements + Delivery Check",
    category: "theme-extensions",
    tagline: "A header bar for announcements and a zip code delivery checker.",
    description:
      "One bar above your header on every page: schedule announcements that appear and disappear on their own, and let shoppers enter a zip code to see whether you deliver there and for how much.",
    icon: MegaphoneIcon,
    image: "/features/smart-announcements.svg",
    to: "/app/features/smart-announcements",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "07",
    key: "seo-ai",
    name: "SEO AI",
    category: "content-seo",
    tagline: "AI SEO for products and collections.",
    description:
      "Rewrite titles and meta descriptions for products and collections with AI, review the suggestions, and apply them in bulk.",
    icon: SearchIcon,
    image: "/features/seo-ai.svg",
    to: "/app/features/seo-ai",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "08",
    key: "subscribe-boost",
    name: "Subscribe Boost",
    category: "theme-extensions",
    tagline: "Subscribe popups that grow your list.",
    description:
      "Launch a subscribe popup with its own headline, offer, and timing, and capture emails before the rush.",
    icon: EmailNewsletterIcon,
    image: "/features/subscribe-boost.svg",
    to: "/app/features/subscribe-boost",
    plan: "Advance",
    gate: { hasAssistant: true },
  },
  {
    number: "09",
    key: "smart-recommendations",
    name: "Smart Recommendations",
    category: "sales-pricing",
    tagline: "Cart recommendations driven by your rules.",
    description:
      "Set rules like \"when the cart has a bouquet, suggest vases under $40\" and the cart page shows matching products from your store with one-tap add to cart.",
    icon: MagicIcon,
    image: "/features/smart-recommendations.svg",
    to: "/app/recommendations",
    plan: "Advance",
    gate: { hasRecommendations: true },
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

export const getOneAppCategory = (
  key: string,
): OneAppCategory | undefined =>
  ONEAPP_CATEGORIES.find((category) => category.key === key);

/** Features of one category, in library (index) order. */
export const getCategoryFeatures = (key: OneAppCategoryKey): OneAppFeature[] =>
  ONEAPP_FEATURES.filter((feature) => feature.category === key);

export const categoryPath = (key: OneAppCategoryKey) =>
  `/app/categories/${key}`;

export const REQUEST_FEATURE_EMAIL = "support@8instruments.com";

export const requestFeatureMailto = () =>
  `mailto:${REQUEST_FEATURE_EMAIL}?subject=${encodeURIComponent(
    "OneApp feature request",
  )}&body=${encodeURIComponent(
    "Hi OneApp team,\n\nMy store needs a feature that:\n\n(Describe what you want the feature to do, and where it should appear.)\n",
  )}`;

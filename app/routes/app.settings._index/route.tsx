import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  Icon,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { APP } from "app/constants/app.constants";
import {
  APP_PLANS,
  FREE_BUNDLE_LIMIT,
  FREE_POPUP_SIGNUP_LIMIT,
} from "app/constants/plans";
import { useAppSubscription } from "app/services/subscriptions/hooks/useAppSubscription";

const PRICING_PAGE_URL = `shopify://admin/charges/${APP.APP_HANDLE}/pricing_plans`;

/**
 * The public plan cards. Feature lists cover everything the app currently
 * offers; entitlements must match the seeded `RecurringPlan` flags and
 * limits (see `APP_PLANS`). There are two plans: Free and Advance. Free is
 * limited rather than locked: one bundle and a monthly popup signup cap.
 */
const PLAN_CARDS = [
  {
    name: APP_PLANS.FREE.name,
    price: "Free",
    priceDetail: "No credit card required",
    description: "Set up your storefront and grow your list before you pay a cent.",
    features: [
      "Customer Insights — audiences by tags, order count, spending, and more",
      "Announcement bar above the header, scheduled on its own",
      "Delivery zones and the zip code checker in the header bar",
      `Subscribe Boost popup, up to ${FREE_POPUP_SIGNUP_LIMIT} signups a month`,
      `Bundle Builder — ${FREE_BUNDLE_LIMIT} frequently-bought-together bundle with its checkout discount`,
      "Free shipping progress bar and product star ratings theme blocks",
    ],
  },
  {
    name: APP_PLANS.ADVANCE.name,
    price: "$25/month",
    priceDetail: `${APP_PLANS.ADVANCE.trialDays}-day free trial`,
    description: "Everything in Free without limits, plus the revenue and AI features.",
    features: [
      "Unlimited bundles and unlimited popup signups",
      "Smart Shipping — shipping discounts at checkout, automatic or code-based, targeted at your Audiences",
      "Delivery calendar, same-day cutoffs, timed windows, and checkout rates by zone",
      "Smart Recommendations on the home page and Occasions + Gift Recommendations",
      "SEO AI and FAQ Collections drafted by AI",
    ],
  },
] as const;

function formatInterval(interval?: string | null) {
  if (interval === "ANNUAL") return "year";
  if (interval === "EVERY_30_DAYS") return "30 days";
  return null;
}

export default function Settings() {
  const { subscription, isSubscribed } = useAppSubscription();

  const currentPlan = subscription.recurringPlan;
  const currentPlanName = currentPlan?.name ?? APP_PLANS.FREE.name;
  const interval = formatInterval(currentPlan?.interval);

  const paidPrice =
    subscription.shopifyRecurringPricing?.discountPriceAfter ??
    subscription.shopifyRecurringPricing?.price ??
    currentPlan?.price ??
    0;

  const renewsOn = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Page
      title="Plans & billing"
      subtitle="Manage your OneApp subscription"
      primaryAction={{
        content: isSubscribed ? "Manage plan" : "Choose a plan",
        url: PRICING_PAGE_URL,
      }}
    >
      <BlockStack gap="500">
        {/* Current subscription */}
        <Card>
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  {currentPlanName} plan
                </Text>
                <Badge tone={isSubscribed ? "success" : "info"}>
                  {isSubscribed ? "Active" : "Free"}
                </Badge>
                {subscription.test ? <Badge tone="warning">Test</Badge> : null}
              </InlineStack>
              <Text as="p" variant="headingMd">
                {paidPrice > 0 && interval ? `$${paidPrice} / ${interval}` : "$0"}
              </Text>
            </InlineStack>
            {isSubscribed && renewsOn ? (
              <Text as="p" tone="subdued">
                Renews on {renewsOn}
              </Text>
            ) : (
              <Text as="p" tone="subdued">
                You’re on the Free plan. Upgrade to {APP_PLANS.ADVANCE.name}{" "}
                to unlock every feature in your library.
              </Text>
            )}
          </BlockStack>
        </Card>

        {/* Plan comparison */}
        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
          {PLAN_CARDS.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            const isPaidCard = plan.name !== APP_PLANS.FREE.name;

            return (
              <Card key={plan.name}>
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h3" variant="headingMd">
                        {plan.name}
                      </Text>
                      {isCurrent ? <Badge tone="success">Current plan</Badge> : null}
                    </InlineStack>
                    <Text as="p" variant="heading2xl">
                      {plan.price}
                    </Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      {plan.priceDetail}
                    </Text>
                  </BlockStack>

                  <Text as="p" tone="subdued">
                    {plan.description}
                  </Text>

                  <Divider />

                  <BlockStack gap="200">
                    {plan.features.map((feature) => (
                      <InlineStack key={feature} gap="150" wrap={false} blockAlign="start">
                        <Box>
                          <Icon source={CheckIcon} tone="success" />
                        </Box>
                        <Text as="p">{feature}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>

                  {isPaidCard ? (
                    <Button
                      variant={isCurrent ? "secondary" : "primary"}
                      url={PRICING_PAGE_URL}
                      fullWidth
                    >
                      {isCurrent ? "Manage plan" : `Upgrade to ${plan.name}`}
                    </Button>
                  ) : (
                    <Button
                      disabled={isCurrent}
                      url={PRICING_PAGE_URL}
                      fullWidth
                    >
                      {isCurrent ? "Your current plan" : "Switch plan"}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            );
          })}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}

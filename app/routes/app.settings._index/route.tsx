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
import { APP_PLANS } from "app/constants/plans";
import { useAppSubscription } from "app/services/subscriptions/hooks/useAppSubscription";

const PRICING_PAGE_URL = `shopify://admin/charges/${APP.APP_HANDLE}/pricing_plans`;

/**
 * The public plan cards. Feature lists cover everything the app currently
 * offers; entitlements must match the seeded `RecurringPlan` flags
 * (`hasQualifiers` / `hasShippingDiscounts` / `hasBundles`).
 */
const PLAN_CARDS = [
  {
    name: APP_PLANS.FREE.name,
    price: "Free",
    priceDetail: "No credit card required",
    description: "Get to know your customers and dress up your storefront.",
    features: [
      "Audiences — group customers by tags, order count, spending, and more",
      "Free shipping progress bar theme block",
      "Product star ratings theme block",
    ],
  },
  {
    name: APP_PLANS.BASIC.name, // "Pro" — the mid paid plan
    price: "$10/month",
    priceDetail: `or $108/year (save 10%) · ${APP_PLANS.BASIC.trialDays}-day free trial`,
    description: "Everything in Free, plus the discounts that convert.",
    features: [
      "Everything in the Free plan",
      "Shipping discounts at checkout — automatic or code-based, targeted at your Audiences",
      "Promotion controls: minimum cart value, selected shipping rates, start and end dates",
      "Product bundles (frequently bought together) with automatic checkout discounts",
      "Smart Recommendations blocks for your product and cart pages",
    ],
  },
  {
    name: APP_PLANS.ADVANCE.name,
    price: "$25/month",
    priceDetail: `${APP_PLANS.ADVANCE.trialDays}-day free trial`,
    description: "Everything in Pro, plus your AI shop assistant.",
    features: [
      "Everything in the Pro plan",
      "AI assistant dashboard tailored to your niche",
      "Upcoming occasion radar for your business and country",
      "Store-readiness checklists generated for each season",
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
      subtitle="Manage your Quali8 subscription"
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
                You’re on the Free plan. Upgrade to {APP_PLANS.BASIC.name} to
                unlock shipping discounts and product bundles.
              </Text>
            )}
          </BlockStack>
        </Card>

        {/* Plan comparison */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
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

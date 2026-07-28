import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  Icon,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { CheckIcon, MinusIcon } from "@shopify/polaris-icons";
import { APP } from "app/constants/app.constants";
import { APP_PLANS } from "app/constants/plans";
import { useAppSubscription } from "app/services/subscriptions/hooks/useAppSubscription";

const PRICING_PAGE_URL = `shopify://admin/charges/${APP.APP_HANDLE}/pricing_plans`;

function formatInterval(interval?: string | null) {
  if (interval === "ANNUAL") return "year";
  if (interval === "EVERY_30_DAYS") return "30 days";
  return null;
}

export default function CurrentPlan() {
  const { subscription, isSubscribed } = useAppSubscription();

  const plan = subscription.recurringPlan;
  const planName = plan?.name ?? APP_PLANS.FREE.name;
  const interval = formatInterval(plan?.interval);

  const price =
    subscription.shopifyRecurringPricing?.discountPriceAfter ??
    subscription.shopifyRecurringPricing?.price ??
    plan?.price ??
    0;

  const renewsOn = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const features = [
    {
      label: "Audiences",
      detail: "Group customers by tags, orders, and spending",
      included: plan?.hasQualifiers ?? true,
    },
    {
      label: "Shipping discounts",
      detail: "Automatic or code-based, applied at checkout",
      included: plan?.hasShippingDiscounts ?? false,
    },
    {
      label: "Product bundles",
      detail: "Frequently bought together, discounted automatically",
      included: plan?.hasBundles ?? false,
    },
    {
      label: "Smart recommendations",
      detail: "Occasion, recipient, and budget-aware product picks",
      included: plan?.hasRecommendations ?? false,
    },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Your plan
              </Text>
              <Badge tone={isSubscribed ? "success" : "info"}>
                {isSubscribed ? "Active" : "Free"}
              </Badge>
              {subscription.test ? <Badge tone="warning">Test</Badge> : null}
            </InlineStack>
          </InlineStack>

          <InlineStack align="space-between" blockAlign="end">
            <Text as="p" variant="heading2xl">
              {planName}
            </Text>
            <Text as="p" variant="headingMd">
              {price > 0 && interval ? `$${price} / ${interval}` : "$0"}
            </Text>
          </InlineStack>

          <Text as="p" tone="subdued">
            {isSubscribed && renewsOn
              ? `Renews on ${renewsOn}`
              : `Upgrade to ${APP_PLANS.BASIC.name} to unlock shipping discounts and product bundles.`}
          </Text>
        </BlockStack>

        <Divider />

        <BlockStack gap="200">
          {features.map((feature) => (
            <InlineStack
              key={feature.label}
              gap="150"
              wrap={false}
              blockAlign="start"
            >
              <Box>
                <Icon
                  source={feature.included ? CheckIcon : MinusIcon}
                  tone={feature.included ? "success" : "subdued"}
                />
              </Box>
              <BlockStack gap="0">
                <Text
                  as="p"
                  fontWeight="medium"
                  tone={feature.included ? undefined : "subdued"}
                >
                  {feature.label}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {feature.detail}
                </Text>
              </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>

        <Button
          variant={isSubscribed ? "secondary" : "primary"}
          url={PRICING_PAGE_URL}
          fullWidth
        >
          {isSubscribed ? "Manage plan" : `Upgrade to ${APP_PLANS.BASIC.name}`}
        </Button>
      </BlockStack>
    </Card>
  );
}

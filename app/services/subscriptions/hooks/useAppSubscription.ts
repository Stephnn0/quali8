import { APP_PLANS } from "~/constants/plans";
import { useAppLoaderData, useGatekeepFeature } from "./useGatekeepFeature";

export function useAppSubscription() {
  const { subscription } = useAppLoaderData();

  const isNotSubscribed = useGatekeepFeature({ appPlan: APP_PLANS.BASIC.name }); // Checks if its subscribed to at least the pro plan, incrementally

  const subHasQualifiers = !useGatekeepFeature({ hasQualifiers: true });
  const subHasShippingDiscounts = !useGatekeepFeature({
    hasShippingDiscounts: true,
  });

  return {
    subscription,
    isSubscribed: !isNotSubscribed,
    subscriptionPlanName: subscription.name,

    subHasQualifiers,
    subHasShippingDiscounts,
  };
}

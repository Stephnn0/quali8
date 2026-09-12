import { APP_PLANS } from "app/constants/plans";
import { useAppLoaderData, useGatekeepFeature } from "./useGatekeepFeature";

export function useAppSubscription() {
  const { subscription } = useAppLoaderData();

  const isNotSubscribed = useGatekeepFeature({ appPlan: APP_PLANS.ADVANCE.name }); // Advance is the only paid plan

  const subHasQualifiers = !useGatekeepFeature({ hasQualifiers: true });
  const subHasShippingDiscounts = !useGatekeepFeature({
    hasShippingDiscounts: true,
  });
  const subHasBundles = !useGatekeepFeature({ hasBundles: true });

  return {
    subscription,
    isSubscribed: !isNotSubscribed,
    subscriptionPlanName: subscription.name,

    subHasQualifiers,
    subHasShippingDiscounts,
    subHasBundles,
  };
}

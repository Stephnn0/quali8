import { useRouteLoaderData } from "react-router";
import { gatekeep } from "../gatekeep/gatekeep";
import type { GateKeepArgs, GateKeepCriteria } from "../gatekeep/types";
import type { loader } from "app/routes/app/route";

export function useAppLoaderData() {
  const loaderData = useRouteLoaderData<typeof loader>("routes/app");

  if (!loaderData)
    throw new Error(
      "useAppLoaderData must be used within a route child of the /app route",
    );

  return loaderData;
}

export function useGatekeepFeature(criteria: GateKeepCriteria): boolean {
  const { shopInfo, shop, subscription } = useAppLoaderData();

  // If the required data is not available, we gatekeep the feature
  if (!shopInfo || !shop || !subscription) return true;

  const current: GateKeepArgs["current"] = {
    shop,
    subscription,
    shopPlan: shopInfo.shop.plan.displayName,
    isDevStore: shopInfo.shop.plan.partnerDevelopment,
  };

  // Return a boolean indicating if we should gatekeep the feature.
  return !!gatekeep({ current, criteria });
}

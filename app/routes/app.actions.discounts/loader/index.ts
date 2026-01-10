import type { LoaderFunctionArgs } from "react-router";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { authenticate } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authAdminContext = await authenticate.admin(request);

  await gatekeepRoute(
    { authAdminContext },
    { hasShippingDiscounts: true },
    "redirect",
  ); // * Redirects

  return null;
};

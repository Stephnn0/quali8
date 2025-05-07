import type { LoaderFunctionArgs } from "@remix-run/node";
import { gatekeepRoute } from "~/services/subscriptions/gatekeepRoute";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authAdminContext = await authenticate.admin(request);

  await gatekeepRoute(
    { authAdminContext },
    { hasQualifiers: true },
    "redirect",
  ); // * Redirects

  return null;
};

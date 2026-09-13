import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { PrismaClient } from "@prisma/client";
import { isValidTimezone } from "./shopTime";
import { loadShopTimezone, rememberShopTimezone } from "./deliverySchedule.server";

const GRAPHQL_QUERY_SHOP_TIMEZONE = `#graphql
  query ShopTimezone {
    shop {
      ianaTimezone
    }
  }
`;

/**
 * The shop's IANA time zone, fresh from the Admin API and remembered for
 * the storefront and carrier callbacks (which have no admin session).
 * Falls back to what was synced at install; null when neither is known.
 */
export async function syncShopTimezone(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  shop: string,
): Promise<string | null> {
  try {
    const response = await graphql(GRAPHQL_QUERY_SHOP_TIMEZONE);
    const { data } = (await response.json()) as { data?: { shop?: { ianaTimezone?: string | null } } };
    const timezone = data?.shop?.ianaTimezone;
    if (isValidTimezone(timezone)) {
      await rememberShopTimezone(db, shop, timezone);
      return timezone;
    }
  } catch (error) {
    console.error("Could not read the shop's time zone:", error);
  }
  return loadShopTimezone(db, shop);
}

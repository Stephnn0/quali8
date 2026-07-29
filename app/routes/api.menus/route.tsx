import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";

const GRAPHQL_QUERY_MENUS = `#graphql
  query assistantMenus {
    menus(first: 20) {
      edges {
        node {
          id
          title
          handle
          itemsCount
          isDefault
        }
      }
    }
  }
`;

export type StoreMenu = {
  id: string;
  title: string;
  handle: string;
  itemsCount: number;
};

/**
 * GET /api/menus — the store's navigation menus for the menu-item
 * scheduler. Requires the read_online_store_navigation scope; responds
 * with `scopeMissing` when it hasn't been granted so the UI explains
 * instead of erroring.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

  try {
    const response = await authAdminContext.admin.graphql(GRAPHQL_QUERY_MENUS);
    const payload = await response.json();

    type Edge = {
      node: {
        id: string;
        title: string;
        handle: string;
        itemsCount?: number | null;
      };
    };

    const menus: StoreMenu[] = ((payload.data?.menus.edges ?? []) as Edge[]).map(
      (edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        itemsCount: edge.node.itemsCount ?? 0,
      }),
    );

    return { menus, scopeMissing: false, errors: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const scopeMissing = /access|scope|denied/i.test(message);
    if (!scopeMissing) console.error("Menu listing failed:", error);
    return {
      menus: [],
      scopeMissing,
      errors: scopeMissing
        ? null
        : [{ message: "Could not load your menus. Try again." }],
    };
  }
}

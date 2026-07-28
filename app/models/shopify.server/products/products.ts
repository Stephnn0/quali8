import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { GRAPHQL_QUERY_PRODUCTS_PUBLICATION } from "../graphql/products";

export type ProductPublicationStatus = {
  id: string;
  title: string;
  status: string;
  /** Null when the product has never been published to the Online Store. */
  publishedAt: string | null;
};

export async function getProductsPublicationStatus(
  graphql: AdminGraphqlClient,
  productIds: string[],
): Promise<ProductPublicationStatus[]> {
  try {
    const response = await graphql(GRAPHQL_QUERY_PRODUCTS_PUBLICATION, {
      variables: { ids: productIds },
    });
    const data = await response.json();

    const nodes: Array<ProductPublicationStatus | null> =
      data?.data?.nodes ?? [];
    // `nodes` returns null for deleted ids and {} for non-Product ids.
    return nodes.filter(
      (node): node is ProductPublicationStatus => node != null && !!node.id,
    );
  } catch (error) {
    console.error("Error fetching product publication status:", error);
    throw error;
  }
}

/**
 * Products the storefront Ajax Cart API (`/cart/add.js`) would refuse to add:
 * not ACTIVE, or never published to the Online Store channel. A bundle
 * containing any of these fails to add as a whole, so saves are blocked on
 * them.
 */
export function findUnpublishedProducts(
  products: ProductPublicationStatus[],
): ProductPublicationStatus[] {
  return products.filter(
    (product) => product.status !== "ACTIVE" || product.publishedAt === null,
  );
}

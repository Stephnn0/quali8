import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_QUERY_CUSTOMER_PURCHASES,
  GRAPHQL_QUERY_PRODUCTS_BY_TAG,
} from "../graphql/recommendations";

export type TagProduct = {
  id: string;
  title: string;
  handle: string | null;
  tags: string[];
  productType: string | null;
  imageUrl: string | null;
  variantId: string | null;
  price: number;
};

/** Products matching a Shopify search query (used with tag: terms). */
export async function getProductsByQuery(
  graphql: AdminGraphqlClient,
  query: string,
  first = 25,
): Promise<TagProduct[]> {
  const response = await graphql(GRAPHQL_QUERY_PRODUCTS_BY_TAG, {
    variables: { first, query },
  });
  const { data } = await response.json();

  type Edge = {
    node: {
      id: string;
      title: string;
      handle?: string | null;
      tags?: string[] | null;
      productType?: string | null;
      featuredImage?: { url?: string | null } | null;
      variants?: {
        edges?: Array<{ node: { id: string; price?: string | null } }> | null;
      } | null;
    };
  };

  return ((data?.products.edges ?? []) as Edge[]).map(({ node }) => {
    const variant = node.variants?.edges?.[0]?.node;
    return {
      id: node.id,
      title: node.title,
      handle: node.handle ?? null,
      tags: node.tags ?? [],
      productType: node.productType || null,
      imageUrl: node.featuredImage?.url ?? null,
      variantId: variant?.id ?? null,
      price: Number.parseFloat(variant?.price ?? "0") || 0,
    };
  });
}

export type CustomerPurchases = {
  productIds: string[];
  productTypes: string[];
};

/** Product ids/types from a customer's recent orders (purchase affinity). */
export async function getCustomerPurchases(
  graphql: AdminGraphqlClient,
  customerId: string,
): Promise<CustomerPurchases> {
  const response = await graphql(GRAPHQL_QUERY_CUSTOMER_PURCHASES, {
    variables: { id: customerId },
  });
  const { data } = await response.json();

  type OrderEdge = {
    node: {
      lineItems?: {
        edges?: Array<{
          node: {
            product?: { id: string; productType?: string | null } | null;
          };
        }> | null;
      } | null;
    };
  };

  const productIds = new Set<string>();
  const productTypes = new Set<string>();

  for (const order of (data?.customer?.orders.edges ?? []) as OrderEdge[]) {
    for (const line of order.node.lineItems?.edges ?? []) {
      const product = line.node.product;
      if (!product) continue;
      productIds.add(product.id);
      if (product.productType) productTypes.add(product.productType);
    }
  }

  return {
    productIds: [...productIds],
    productTypes: [...productTypes],
  };
}

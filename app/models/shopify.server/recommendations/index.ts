import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_QUERY_CUSTOMER_PURCHASES,
  GRAPHQL_QUERY_PRODUCTS_BY_IDS,
  GRAPHQL_QUERY_PRODUCTS_BY_TAG,
  GRAPHQL_QUERY_PRODUCTS_RECENT,
} from "../graphql/recommendations";

export type SellableProduct = {
  id: string;
  title: string;
  handle: string | null;
  tags: string[];
  productType: string | null;
  imageUrl: string | null;
  /** First variant that is in stock — the one the storefront adds to cart. */
  variantId: string | null;
  price: number;
};

type ProductNode = {
  __typename?: string;
  id: string;
  title: string;
  handle?: string | null;
  tags?: string[] | null;
  productType?: string | null;
  status?: string | null;
  onlineStoreUrl?: string | null;
  featuredImage?: { url?: string | null } | null;
  variants?: {
    edges?: Array<{
      node: { id: string; price?: string | null; availableForSale?: boolean };
    }> | null;
  } | null;
};

/**
 * Maps an Admin API product to a storefront-sellable candidate, or null when
 * the storefront cart would reject it: the Admin API returns products that
 * are archived/draft, not published to the Online Store, or fully sold out —
 * adding those yields "Cannot find variant or is already sold out".
 */
function toSellableProduct(node: ProductNode): SellableProduct | null {
  if (node.status && node.status !== "ACTIVE") return null;
  if (!node.onlineStoreUrl) return null;

  const available = (node.variants?.edges ?? []).find(
    (edge) => edge.node.availableForSale,
  )?.node;
  if (!available) return null;

  return {
    id: node.id,
    title: node.title,
    handle: node.handle ?? null,
    tags: node.tags ?? [],
    productType: node.productType || null,
    imageUrl: node.featuredImage?.url ?? null,
    variantId: available.id,
    price: Number.parseFloat(available.price ?? "0") || 0,
  };
}

/** Sellable products matching a Shopify search query (used with tag: terms). */
export async function getProductsByQuery(
  graphql: AdminGraphqlClient,
  query: string,
  first = 25,
): Promise<SellableProduct[]> {
  const response = await graphql(GRAPHQL_QUERY_PRODUCTS_BY_TAG, {
    variables: { first, query },
  });
  const { data } = await response.json();

  const edges = (data?.products.edges ?? []) as Array<{ node: ProductNode }>;
  return edges
    .map(({ node }) => toSellableProduct(node))
    .filter((product): product is SellableProduct => product !== null);
}

/**
 * Recently updated sellable products, for general recommendations when no
 * occasion, tag, or curated candidates match.
 */
export async function getRecentProducts(
  graphql: AdminGraphqlClient,
  first = 40,
): Promise<SellableProduct[]> {
  const response = await graphql(GRAPHQL_QUERY_PRODUCTS_RECENT, {
    variables: { first },
  });
  const { data } = await response.json();

  const edges = (data?.products.edges ?? []) as Array<{ node: ProductNode }>;
  return edges
    .map(({ node }) => toSellableProduct(node))
    .filter((product): product is SellableProduct => product !== null);
}

/**
 * Live state for known product ids. Used to verify curated occasion products
 * before recommending them — snapshots go stale (price changes, variants
 * replaced, product unpublished or sold out).
 */
export async function getProductsByIds(
  graphql: AdminGraphqlClient,
  ids: string[],
): Promise<Map<string, SellableProduct>> {
  const sellable = new Map<string, SellableProduct>();
  if (ids.length === 0) return sellable;

  const response = await graphql(GRAPHQL_QUERY_PRODUCTS_BY_IDS, {
    variables: { ids },
  });
  const { data } = await response.json();

  for (const node of (data?.nodes ?? []) as Array<ProductNode | null>) {
    if (!node || node.__typename !== "Product") continue;
    const product = toSellableProduct(node);
    if (product) sellable.set(product.id, product);
  }
  return sellable;
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

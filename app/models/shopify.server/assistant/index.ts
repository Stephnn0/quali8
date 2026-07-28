import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";

const GRAPHQL_QUERY_PRODUCT_SAMPLE = `#graphql
  query assistantProductSample($first: Int!) {
    productsCount {
      count
    }
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          title
          productType
          tags
        }
      }
    }
  }
`;

export type ProductSample = {
  productCount: number;
  /** Titles, types, and tags flattened into classification text. */
  text: string;
};

/** A lightweight catalog sample for niche inference. */
export async function getProductSample(
  graphql: AdminGraphqlClient,
  first = 50,
): Promise<ProductSample> {
  const response = await graphql(GRAPHQL_QUERY_PRODUCT_SAMPLE, {
    variables: { first },
  });
  const { data } = await response.json();

  type Edge = {
    node: {
      title: string;
      productType?: string | null;
      tags?: string[] | null;
    };
  };

  const parts: string[] = [];
  for (const { node } of (data?.products.edges ?? []) as Edge[]) {
    parts.push(node.title);
    if (node.productType) parts.push(node.productType);
    if (node.tags?.length) parts.push(node.tags.join(" "));
  }

  return {
    productCount: data?.productsCount?.count ?? 0,
    text: parts.join(" | ").slice(0, 6000),
  };
}

import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";

export type SeoResource = {
  id: string;
  title: string;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

const GRAPHQL_QUERY_SEO_PRODUCTS = `#graphql
  query seoProducts($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          featuredImage {
            url
          }
          seo {
            title
            description
          }
        }
      }
    }
  }
`;

const GRAPHQL_QUERY_SEO_COLLECTIONS = `#graphql
  query seoCollections($first: Int!, $query: String) {
    collections(first: $first, query: $query) {
      edges {
        node {
          id
          title
          image {
            url
          }
          seo {
            title
            description
          }
        }
      }
    }
  }
`;

const GRAPHQL_MUTATION_PRODUCT_SEO = `#graphql
  mutation seoProductUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
      }
      userErrors {
        message
      }
    }
  }
`;

const GRAPHQL_MUTATION_COLLECTION_SEO = `#graphql
  mutation seoCollectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection {
        id
      }
      userErrors {
        message
      }
    }
  }
`;

type Edge = {
  node: {
    id: string;
    title: string;
    featuredImage?: { url?: string | null } | null;
    image?: { url?: string | null } | null;
    seo?: { title?: string | null; description?: string | null } | null;
  };
};

export async function listSeoResources(
  graphql: AdminGraphqlClient,
  type: "PRODUCT" | "COLLECTION",
  search: string,
  first = 50,
): Promise<SeoResource[]> {
  const document =
    type === "PRODUCT" ? GRAPHQL_QUERY_SEO_PRODUCTS : GRAPHQL_QUERY_SEO_COLLECTIONS;
  const response = await graphql(document, {
    variables: { first, query: search || null },
  });
  const { data } = await response.json();

  const edges = ((type === "PRODUCT" ? data?.products : data?.collections)
    ?.edges ?? []) as Edge[];

  return edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    imageUrl: node.featuredImage?.url ?? node.image?.url ?? null,
    seoTitle: node.seo?.title || null,
    seoDescription: node.seo?.description || null,
  }));
}

/** Applies SEO metadata; returns null on success or an error message. */
export async function applySeo(
  graphql: AdminGraphqlClient,
  type: "PRODUCT" | "COLLECTION",
  id: string,
  seo: { title: string; description: string },
): Promise<string | null> {
  const document =
    type === "PRODUCT" ? GRAPHQL_MUTATION_PRODUCT_SEO : GRAPHQL_MUTATION_COLLECTION_SEO;
  const response = await graphql(document, {
    variables: { input: { id, seo } },
  });
  const { data } = await response.json();

  const payload = type === "PRODUCT" ? data?.productUpdate : data?.collectionUpdate;
  const message = (payload?.userErrors ?? [])
    .map((userError: { message: string }) => userError.message)
    .join("; ");
  return message || null;
}

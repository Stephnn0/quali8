const PRODUCT_FIELDS = `#graphql
  fragment RecommendationProductFields on Product {
    id
    title
    handle
    tags
    productType
    status
    # Null when the product is not published to the Online Store — such
    # products cannot be added to the storefront cart.
    onlineStoreUrl
    featuredImage {
      url
    }
    variants(first: 10) {
      edges {
        node {
          id
          price
          availableForSale
        }
      }
    }
  }
`;

export const GRAPHQL_QUERY_PRODUCTS_BY_TAG = `#graphql
  ${PRODUCT_FIELDS}
  query productsByTag($first: Int!, $query: String!) {
    products(first: $first, query: $query) {
      edges {
        node {
          ...RecommendationProductFields
        }
      }
    }
  }
`;

/** Newest active products first — the general pool when nothing matches. */
export const GRAPHQL_QUERY_PRODUCTS_RECENT = `#graphql
  ${PRODUCT_FIELDS}
  query productsRecent($first: Int!) {
    products(first: $first, query: "status:active", sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          ...RecommendationProductFields
        }
      }
    }
  }
`;

/** Sellable products of one collection (occasion collections, rule sources). */
export const GRAPHQL_QUERY_COLLECTION_PRODUCTS = `#graphql
  ${PRODUCT_FIELDS}
  query collectionProducts($id: ID!, $first: Int!) {
    collection(id: $id) {
      id
      products(first: $first) {
        edges {
          node {
            ...RecommendationProductFields
          }
        }
      }
    }
  }
`;

/** Which collections the cart's products belong to (rule triggers). */
export const GRAPHQL_QUERY_PRODUCT_COLLECTIONS = `#graphql
  query productCollections($ids: [ID!]!) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        id
        collections(first: 25) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
`;

export const GRAPHQL_QUERY_PRODUCTS_BY_IDS = `#graphql
  ${PRODUCT_FIELDS}
  query productsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        ...RecommendationProductFields
      }
    }
  }
`;

export const GRAPHQL_QUERY_CUSTOMER_PURCHASES = `#graphql
  query customerPurchases($id: ID!) {
    customer(id: $id) {
      orders(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            lineItems(first: 10) {
              edges {
                node {
                  product {
                    id
                    productType
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

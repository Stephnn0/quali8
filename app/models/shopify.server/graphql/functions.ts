export const GRAPHQL_QUERY_SHOPIFY_FUNCTIONS = `#graphql
  query getShopifyFunctions($first: Int) {
    shopifyFunctions(first: $first) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

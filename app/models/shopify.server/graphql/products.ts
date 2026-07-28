export const GRAPHQL_QUERY_PRODUCTS_PUBLICATION = `#graphql
  query productsPublication($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        status
        publishedAt
      }
    }
  }
`;

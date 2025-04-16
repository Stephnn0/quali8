export const GRAPHQL_QUERY_CUSTOMERS = `#graphql
  query customers($first: Int) {
    customers(first: $first) {
      edges {
        node {
          id
          firstName
          lastName
          createdAt

        }
      }
    }
  }
`;

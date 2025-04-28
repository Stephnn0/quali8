export const GRAPHQL_QUERY_CUSTOMERS = `#graphql
  query customers($first: Int, $query: String) {
    customers(first: $first, query: $query) {
      edges {
        node {
          id
          firstName
          lastName
          createdAt
          addresses {
           country
          }
          amountSpent {
           amount
          }
          lastOrder {
            createdAt
          }
          defaultEmailAddress {
            emailAddress
          }
          orders {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
  }
`;

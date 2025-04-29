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
          defaultAddress {
            address1
          }
          orders(first: 40) {
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

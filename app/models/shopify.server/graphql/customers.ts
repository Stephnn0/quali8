export const GRAPHQL_QUERY_CUSTOMERS = `#graphql
  query customers($first: Int, $query: String) {
    customers(first: $first, query: $query) {
      edges {
        node {
          id
          firstName
          lastName
          createdAt
          numberOfOrders
          amountSpent {
           amount
          }
          defaultAddress {
            country
          }
        }
      }
    }
  }
`;

/**
 * Store-wide sample for the Audiences analytics section: the most recent
 * customers plus the total count so the UI can say how representative the
 * sample is.
 */
export const GRAPHQL_QUERY_CUSTOMER_INSIGHTS = `#graphql
  query customerInsights($first: Int!) {
    customersCount {
      count
    }
    customers(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          createdAt
          numberOfOrders
          amountSpent {
            amount
          }
          defaultAddress {
            country
          }
        }
      }
    }
  }
`;

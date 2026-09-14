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

/** Finds the customer that owns an email (for the popup subscribe flow). */
export const GRAPHQL_QUERY_CUSTOMER_BY_EMAIL = `#graphql
  query popupCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      edges {
        node {
          id
          tags
          emailMarketingConsent {
            marketingState
          }
        }
      }
    }
  }
`;

export const GRAPHQL_MUTATION_POPUP_CUSTOMER_CREATE = `#graphql
  mutation popupCustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_POPUP_CUSTOMER_TAGS_ADD = `#graphql
  mutation popupCustomerTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_POPUP_CUSTOMER_CONSENT = `#graphql
  mutation popupCustomerConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

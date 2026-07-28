export const GRAPHQL_QUERY_PRODUCTS_BY_TAG = `#graphql
  query productsByTag($first: Int!, $query: String!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          tags
          productType
          featuredImage {
            url
          }
          variants(first: 1) {
            edges {
              node {
                id
                price
              }
            }
          }
        }
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

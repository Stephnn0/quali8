export const GRAPHQL_QUERY_SHOP_INFO = `#graphql
  query ShopInfo($appURLMetafieldKey: String!, $appENVMetafieldNamespace: String!) {
    shop {
      id
      email
      shopOwnerName
      currencyCode
      plan {
        displayName
        shopifyPlus
        partnerDevelopment
      }
      ianaTimezone 
      appURLMetafield: metafield(key: $appURLMetafieldKey, namespace: $appENVMetafieldNamespace) {
        key
        namespace
        value
        definition {
          access {
            admin
            customerAccount
            storefront
          }
        }
      }
    }
    checkoutProfiles(first: 1, query: "is_published:true") {
      nodes {
        id
      }
    }
    app {
      id
    }
    currentAppInstallation {
      activeSubscriptions {
        id
        trialDays
        name
        status
      }
    }
  }
`;

export const GRAPHQL_QUERY_SHOP_ID = `#graphql
  query ShopId {
    shop {
      id
    }
  }
`;

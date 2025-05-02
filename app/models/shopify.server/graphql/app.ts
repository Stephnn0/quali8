export const GRAPHQL_QUERY_APP_INSTALLATION_ID_AND_METAFIELDS = `#graphql
  query AppIdAndMetafields($namespace: String!) {
    app {
      id
      installation {
        id
        metafields(first: 3, namespace: $namespace) {
          nodes {
            id
            key
            namespace
            value
          }
        }
      }
    }
  }
`;

export const GRAPHQL_QUERY_APP_ID_AND_SHOP_ID_WITH_METAFIELDS = `#graphql
  query AppIdAndShopIdWithMetafields($namespace: String, $ownerType: MetafieldOwnerType!) {
    app {
      id
    }
    shop {
      id
      metafields(first: 50, namespace: $namespace) {
        nodes {
          id
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
    }
    metafieldDefinitions(first: 50, namespace: $namespace, ownerType: $ownerType) {
      nodes {
        namespace
        key
        access {
          admin
          customerAccount
          storefront
        }
      }
    }
  }
`;

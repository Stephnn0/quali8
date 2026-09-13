export const GRAPHQL_QUERY_DELIVERY_CUSTOMIZATION_FUNCTIONS = `#graphql
  query DeliveryCustomizationFunctions($first: Int!) {
    shopifyFunctions(first: $first, apiType: "delivery_customization") {
      nodes {
        id
        title
        apiType
        app {
          handle
        }
      }
    }
  }
`;

export const GRAPHQL_QUERY_DELIVERY_CUSTOMIZATIONS = `#graphql
  query DeliveryCustomizations($first: Int!) {
    deliveryCustomizations(first: $first) {
      nodes {
        id
        title
        enabled
        functionId
      }
    }
  }
`;

export const GRAPHQL_MUTATION_DELIVERY_CUSTOMIZATION_CREATE = `#graphql
  mutation DeliveryCustomizationCreate($deliveryCustomization: DeliveryCustomizationInput!) {
    deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
      deliveryCustomization {
        id
        enabled
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_DELIVERY_CUSTOMIZATION_UPDATE = `#graphql
  mutation DeliveryCustomizationUpdate($id: ID!, $deliveryCustomization: DeliveryCustomizationInput!) {
    deliveryCustomizationUpdate(id: $id, deliveryCustomization: $deliveryCustomization) {
      deliveryCustomization {
        id
        enabled
      }
      userErrors {
        field
        message
      }
    }
  }
`;

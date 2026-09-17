export const GRAPHQL_QUERY_VALIDATION_FUNCTIONS = `#graphql
  query ValidationFunctions($first: Int!) {
    shopifyFunctions(first: $first, apiType: "cart_checkout_validation") {
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

export const GRAPHQL_QUERY_VALIDATIONS = `#graphql
  query Validations($first: Int!) {
    validations(first: $first) {
      nodes {
        id
        title
        enabled
        shopifyFunction {
          id
          app {
            handle
          }
        }
      }
    }
  }
`;

export const GRAPHQL_MUTATION_VALIDATION_CREATE = `#graphql
  mutation ValidationCreate($validation: ValidationCreateInput!) {
    validationCreate(validation: $validation) {
      validation {
        id
        enabled
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const GRAPHQL_MUTATION_VALIDATION_UPDATE = `#graphql
  mutation ValidationUpdate($id: ID!, $validation: ValidationUpdateInput!) {
    validationUpdate(id: $id, validation: $validation) {
      validation {
        id
        enabled
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

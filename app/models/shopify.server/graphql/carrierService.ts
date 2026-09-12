export const GRAPHQL_QUERY_CARRIER_SERVICES = `#graphql
  query quali8CarrierServices($first: Int!) {
    carrierServices(first: $first) {
      nodes {
        id
        name
        callbackUrl
        active
      }
    }
  }
`;

export const GRAPHQL_MUTATION_CARRIER_SERVICE_CREATE = `#graphql
  mutation quali8CarrierServiceCreate($input: DeliveryCarrierServiceCreateInput!) {
    carrierServiceCreate(input: $input) {
      carrierService {
        id
        name
        callbackUrl
        active
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_CARRIER_SERVICE_UPDATE = `#graphql
  mutation quali8CarrierServiceUpdate($input: DeliveryCarrierServiceUpdateInput!) {
    carrierServiceUpdate(input: $input) {
      carrierService {
        id
        name
        callbackUrl
        active
      }
      userErrors {
        field
        message
      }
    }
  }
`;

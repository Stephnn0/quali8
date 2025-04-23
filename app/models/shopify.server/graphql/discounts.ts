export const GRAPHQL_MUTATION_CREATE_DISCOUNT = `#graphql
  mutation discountCodeAppCreate(
   $functionId: String!
   $title: String!
   $startsAt: DateTime!
   $code: String!
   $metafields: [MetafieldInput!]!
  ) {
    discountCodeAppCreate(
      codeAppDiscount: {
        functionId: $functionId
        title: $title
        startsAt: $startsAt
        code: $code
        metafields: $metafields
      }
    ) {
      codeAppDiscount {
        discountId
      }
      userErrors {
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT = `#graphql
  mutation discountAutomaticAppCreate(
   $functionId: String!
   $title: String!
   $startsAt: DateTime!
   $metafields: [MetafieldInput!]!
  ) {
    discountAutomaticAppCreate(
      automaticAppDiscount: {
        functionId: $functionId
        title: $title
        startsAt: $startsAt
        metafields: $metafields
      }
    ) {
      automaticAppDiscount {
        discountId
      }
      userErrors {
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_DELETE_CODE_DISCOUNT = `#graphql
  mutation discountCodeAppDelete($ID: ID!) {
    discountCodeDelete(id: $ID) {
      deletedCodeDiscountId
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_DELETE_AUTOMATIC_DISCOUNT = `#graphql
  mutation discountAutomaticAppDelete($ID: ID!) {
    discountAutomaticDelete(id: $ID) {
      deletedAutomaticDiscountId
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_UPDATE_CODE_DISCOUNT = `#graphql
  mutation discountCodeAppUpdate($codeAppDiscount: DiscountCodeAppInput!, $id: ID!) {
    discountCodeAppUpdate(codeAppDiscount: $codeAppDiscount, id: $id) {
      codeAppDiscount {
        discountId
        title
        startsAt
        endsAt
        usageLimit
        status
        appliesOncePerCustomer
        codes {
          edges {
            node {
              code
            }
          }
        }
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_UPDATE_AUTOMATIC_DISCOUNT = `#graphql
  mutation discountAutomaticAppUpdate($automaticAppDiscount: DiscountAutomaticAppInput!, $id: ID!) {
    discountAutomaticAppUpdate(automaticAppDiscount: $automaticAppDiscount, id: $id) {
      automaticAppDiscount {
        discountId
        title
        startsAt
        endsAt
        status
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

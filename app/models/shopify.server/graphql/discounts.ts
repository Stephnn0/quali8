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

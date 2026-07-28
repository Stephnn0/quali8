export const GRAPHQL_MUTATION_CREATE_DISCOUNT = `#graphql
  mutation discountCodeAppCreate(
   $functionHandle: String
   $title: String!
   $startsAt: DateTime!
   $endsAt: DateTime
   $code: String!
   $metafields: [MetafieldInput!]!
   $orderDiscounts: Boolean
   $productDiscounts: Boolean
   $shippingDiscounts: Boolean
   $appliesOncePerCustomer: Boolean
  ) {
    discountCodeAppCreate(
      codeAppDiscount: {
        functionHandle: $functionHandle
        title: $title
        startsAt: $startsAt
        endsAt: $endsAt
        code: $code
        metafields: $metafields
        # Required for functions on the modern discounts API type
        discountClasses: [SHIPPING]
        combinesWith:  {
           orderDiscounts: $orderDiscounts
           productDiscounts: $productDiscounts
           shippingDiscounts: $shippingDiscounts
        }
        appliesOncePerCustomer: $appliesOncePerCustomer
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
   $functionHandle: String
   $title: String!
   $startsAt: DateTime!
   $endsAt: DateTime
   $metafields: [MetafieldInput!]!
   $orderDiscounts: Boolean
   $productDiscounts: Boolean
   $shippingDiscounts: Boolean
  ) {
    discountAutomaticAppCreate(
      automaticAppDiscount: {
        functionHandle: $functionHandle
        title: $title
        startsAt: $startsAt
        endsAt: $endsAt
        metafields: $metafields
        # Required for functions on the modern discounts API type
        discountClasses: [SHIPPING]
        combinesWith:  {
           orderDiscounts: $orderDiscounts
           productDiscounts: $productDiscounts
           shippingDiscounts: $shippingDiscounts
        }
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

// ! ---------------------------------- NOT USED-----------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

// export const GRAPHQL_MUTATION_UPDATE_CODE_DISCOUNT = `#graphql
//   mutation discountCodeAppUpdate($codeAppDiscount: DiscountCodeAppInput!, $ID: ID!) {
//     discountCodeAppUpdate(codeAppDiscount: $codeAppDiscount, id: $ID) {
//       codeAppDiscount {
//         title
//         startsAt
//         endsAt
//         # usageLimit
//         status
//         appliesOncePerCustomer
//         # codes {
//         #   edges {
//         #     node {
//         #       code
//         #     }
//         #   }
//         # }
//       }
//       userErrors {
//         field
//         code
//         message
//       }
//     }
//   }
// `;

// export const GRAPHQL_MUTATION_UPDATE_AUTOMATIC_DISCOUNT = `#graphql
//   mutation discountAutomaticAppUpdate($automaticAppDiscount: DiscountAutomaticAppInput!, $ID: ID!) {
//     discountAutomaticAppUpdate(automaticAppDiscount: $automaticAppDiscount, id: $ID) {
//       automaticAppDiscount {
//         title
//         startsAt
//         endsAt
//         status

//       }
//       userErrors {
//         field
//         code
//         message
//       }
//     }
//   }
// `;

// export const GRAPHQL_MUTATION_CODE_UPDATE_DISCOUNT = `#graphql
//   mutation discountCodeAppUpdate(
//    $functionId: String!
//    $title: String!
//    $startsAt: DateTime!
//    $code: String!
//    $metafields: [MetafieldInput!]!
//    $ID: ID!
//   ) {
//     discountCodeAppUpdate(
//       id: $ID,
//       codeAppDiscount: {
//         functionId: $functionId
//         title: $title
//         startsAt: $startsAt
//         code: $code
//         metafields: $metafields
//       }
//     ) {
//       codeAppDiscount {
//         discountId
//       }
//       userErrors {
//         message
//       }
//     }
//   }
// `;

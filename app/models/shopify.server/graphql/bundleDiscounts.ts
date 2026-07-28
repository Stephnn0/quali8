/**
 * Mutations for the shop's single bundle automatic discount.
 *
 * These are NOT executed through `admin.graphql` (pinned to January25 in
 * app/shopify.server.ts) — `discountClasses` and `functionHandle` don't exist
 * there. They run through `createAdminApiClient` pinned to 2026-04 in
 * `../discounts/bundleDiscounts.server.ts`, matching the api_version of
 * extensions/bundle-discounts.
 */

export const GRAPHQL_MUTATION_CREATE_BUNDLE_AUTOMATIC_DISCOUNT = `#graphql
  mutation bundleDiscountCreate(
    $functionHandle: String
    $title: String!
    $startsAt: DateTime!
    $metafields: [MetafieldInput!]!
  ) {
    discountAutomaticAppCreate(
      automaticAppDiscount: {
        functionHandle: $functionHandle
        title: $title
        startsAt: $startsAt
        discountClasses: [PRODUCT]
        combinesWith: {
          orderDiscounts: false
          productDiscounts: false
          shippingDiscounts: true
        }
        metafields: $metafields
      }
    ) {
      automaticAppDiscount {
        discountId
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_SET_BUNDLE_DISCOUNT_METAFIELD = `#graphql
  mutation bundleDiscountMetafieldSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const GRAPHQL_MUTATION_DELETE_BUNDLE_AUTOMATIC_DISCOUNT = `#graphql
  mutation bundleDiscountDelete($id: ID!) {
    discountAutomaticDelete(id: $id) {
      deletedAutomaticDiscountId
      userErrors {
        field
        message
      }
    }
  }
`;

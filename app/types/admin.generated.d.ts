/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CustomersQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type CustomersQuery = { customers: { edges: Array<{ node: Pick<AdminTypes.Customer, 'id' | 'firstName' | 'lastName' | 'createdAt'> }> } };

export type DeliveryProfilesQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type DeliveryProfilesQuery = { deliveryProfiles: { nodes: Array<(
      Pick<AdminTypes.DeliveryProfile, 'id' | 'name'>
      & { profileLocationGroups: Array<{ locationGroup: Pick<AdminTypes.DeliveryLocationGroup, 'id'>, locationGroupZones: { edges: Array<{ node: { methodDefinitions: { edges: Array<{ node: Pick<AdminTypes.DeliveryMethodDefinition, 'id' | 'description' | 'name'> }> } } }> } }> }
    )> } };

export type DiscountCodeAppCreateMutationVariables = AdminTypes.Exact<{
  functionId: AdminTypes.Scalars['String']['input'];
  title: AdminTypes.Scalars['String']['input'];
  startsAt: AdminTypes.Scalars['DateTime']['input'];
  code: AdminTypes.Scalars['String']['input'];
  metafields: Array<AdminTypes.MetafieldInput> | AdminTypes.MetafieldInput;
}>;


export type DiscountCodeAppCreateMutation = { discountCodeAppCreate?: AdminTypes.Maybe<{ codeAppDiscount?: AdminTypes.Maybe<Pick<AdminTypes.DiscountCodeApp, 'discountId'>>, userErrors: Array<Pick<AdminTypes.DiscountUserError, 'message'>> }> };

interface GeneratedQueryTypes {
  "#graphql\n  query customers($first: Int, $query: String) {\n    customers(first: $first, query: $query) {\n      edges {\n        node {\n          id\n          firstName\n          lastName\n          createdAt\n\n        }\n      }\n    }\n  }\n": {return: CustomersQuery, variables: CustomersQueryVariables},
  "#graphql\n  query deliveryProfiles($first: Int) {\n    deliveryProfiles(first: $first) {\n      nodes {\n         id\n         name\n         profileLocationGroups {\n           locationGroup {\n             id\n           }\n           locationGroupZones(first: 50) { \n             edges {\n               node {\n                  methodDefinitions(first: 50){\n                    edges {\n                      node {\n                         id\n                         description\n                         name\n                     }\n                   }\n                 }\n               }\n             }\n           }\n         }\n       }\n    }\n  }\n": {return: DeliveryProfilesQuery, variables: DeliveryProfilesQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation discountCodeAppCreate(\n   $functionId: String!\n   $title: String!\n   $startsAt: DateTime!\n   $code: String!\n   $metafields: [MetafieldInput!]!\n  ) {\n    discountCodeAppCreate(\n      codeAppDiscount: {\n        functionId: $functionId\n        title: $title\n        startsAt: $startsAt\n        code: $code\n        metafields: $metafields\n      }\n    ) {\n      codeAppDiscount {\n        discountId\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: DiscountCodeAppCreateMutation, variables: DiscountCodeAppCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}

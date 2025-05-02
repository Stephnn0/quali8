/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CustomersQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type CustomersQuery = { customers: { edges: Array<{ node: (
        Pick<AdminTypes.Customer, 'id' | 'firstName' | 'lastName' | 'createdAt'>
        & { addresses: Array<Pick<AdminTypes.MailingAddress, 'country'>>, amountSpent: Pick<AdminTypes.MoneyV2, 'amount'>, lastOrder?: AdminTypes.Maybe<Pick<AdminTypes.Order, 'createdAt'>>, defaultAddress?: AdminTypes.Maybe<Pick<AdminTypes.MailingAddress, 'address1'>>, orders: { edges: Array<{ node: Pick<AdminTypes.Order, 'id'> }> } }
      ) }> } };

export type DeliveryProfilesQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type DeliveryProfilesQuery = { deliveryProfiles: { nodes: Array<(
      Pick<AdminTypes.DeliveryProfile, 'name'>
      & { profileLocationGroups: Array<{ locationGroupZones: { edges: Array<{ node: { methodDefinitions: { edges: Array<{ node: (
                    Pick<AdminTypes.DeliveryMethodDefinition, 'name'>
                    & { rateProvider: (
                      Pick<AdminTypes.DeliveryRateDefinition, 'id'>
                      & { price: Pick<AdminTypes.MoneyV2, 'amount'> }
                    ) }
                  ) }> } } }> } }> }
    )> } };

export type DiscountCodeAppCreateMutationVariables = AdminTypes.Exact<{
  functionId: AdminTypes.Scalars['String']['input'];
  title: AdminTypes.Scalars['String']['input'];
  startsAt: AdminTypes.Scalars['DateTime']['input'];
  endsAt?: AdminTypes.InputMaybe<AdminTypes.Scalars['DateTime']['input']>;
  code: AdminTypes.Scalars['String']['input'];
  metafields: Array<AdminTypes.MetafieldInput> | AdminTypes.MetafieldInput;
  orderDiscounts?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
  productDiscounts?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
  shippingDiscounts?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
  appliesOncePerCustomer?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
}>;


export type DiscountCodeAppCreateMutation = { discountCodeAppCreate?: AdminTypes.Maybe<{ codeAppDiscount?: AdminTypes.Maybe<Pick<AdminTypes.DiscountCodeApp, 'discountId'>>, userErrors: Array<Pick<AdminTypes.DiscountUserError, 'message'>> }> };

export type DiscountAutomaticAppCreateMutationVariables = AdminTypes.Exact<{
  functionId: AdminTypes.Scalars['String']['input'];
  title: AdminTypes.Scalars['String']['input'];
  startsAt: AdminTypes.Scalars['DateTime']['input'];
  endsAt?: AdminTypes.InputMaybe<AdminTypes.Scalars['DateTime']['input']>;
  metafields: Array<AdminTypes.MetafieldInput> | AdminTypes.MetafieldInput;
  orderDiscounts?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
  productDiscounts?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
  shippingDiscounts?: AdminTypes.InputMaybe<AdminTypes.Scalars['Boolean']['input']>;
}>;


export type DiscountAutomaticAppCreateMutation = { discountAutomaticAppCreate?: AdminTypes.Maybe<{ automaticAppDiscount?: AdminTypes.Maybe<Pick<AdminTypes.DiscountAutomaticApp, 'discountId'>>, userErrors: Array<Pick<AdminTypes.DiscountUserError, 'message'>> }> };

export type DiscountCodeAppDeleteMutationVariables = AdminTypes.Exact<{
  ID: AdminTypes.Scalars['ID']['input'];
}>;


export type DiscountCodeAppDeleteMutation = { discountCodeDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.DiscountCodeDeletePayload, 'deletedCodeDiscountId'>
    & { userErrors: Array<Pick<AdminTypes.DiscountUserError, 'field' | 'code' | 'message'>> }
  )> };

export type DiscountAutomaticAppDeleteMutationVariables = AdminTypes.Exact<{
  ID: AdminTypes.Scalars['ID']['input'];
}>;


export type DiscountAutomaticAppDeleteMutation = { discountAutomaticDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.DiscountAutomaticDeletePayload, 'deletedAutomaticDiscountId'>
    & { userErrors: Array<Pick<AdminTypes.DiscountUserError, 'field' | 'code' | 'message'>> }
  )> };

export type GetShopifyFunctionsQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type GetShopifyFunctionsQuery = { shopifyFunctions: { edges: Array<{ node: Pick<AdminTypes.ShopifyFunction, 'id' | 'title'> }> } };

export type ShopInfoQueryVariables = AdminTypes.Exact<{
  appURLMetafieldKey: AdminTypes.Scalars['String']['input'];
  appENVMetafieldNamespace: AdminTypes.Scalars['String']['input'];
}>;


export type ShopInfoQuery = { shop: (
    Pick<AdminTypes.Shop, 'id' | 'email' | 'shopOwnerName' | 'currencyCode' | 'ianaTimezone'>
    & { plan: Pick<AdminTypes.ShopPlan, 'displayName' | 'shopifyPlus' | 'partnerDevelopment'>, appURLMetafield?: AdminTypes.Maybe<(
      Pick<AdminTypes.Metafield, 'key' | 'namespace' | 'value'>
      & { definition?: AdminTypes.Maybe<{ access: Pick<AdminTypes.MetafieldAccess, 'admin' | 'customerAccount' | 'storefront'> }> }
    )> }
  ), checkoutProfiles: { nodes: Array<Pick<AdminTypes.CheckoutProfile, 'id'>> }, app?: AdminTypes.Maybe<Pick<AdminTypes.App, 'id'>>, currentAppInstallation: { activeSubscriptions: Array<Pick<AdminTypes.AppSubscription, 'id' | 'trialDays' | 'name' | 'status'>> } };

export type ShopIdQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type ShopIdQuery = { shop: Pick<AdminTypes.Shop, 'id'> };

interface GeneratedQueryTypes {
  "#graphql\n  query customers($first: Int, $query: String) {\n    customers(first: $first, query: $query) {\n      edges {\n        node {\n          id\n          firstName\n          lastName\n          createdAt\n          addresses {\n           country\n          }\n          amountSpent {\n           amount\n          }\n          lastOrder {\n            createdAt\n          }\n          defaultAddress {\n            address1\n          }\n          orders(first: 40) {\n            edges {\n              node {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: CustomersQuery, variables: CustomersQueryVariables},
  "#graphql\n  query deliveryProfiles($first: Int) {\n    deliveryProfiles(first: $first) {\n      nodes {\n         name\n         profileLocationGroups {\n           locationGroupZones(first: 20) {\n             edges {\n               node {\n                  methodDefinitions(first: 20){\n                    edges {\n                      node {\n                         name\n                         rateProvider {\n                          ... on DeliveryRateDefinition {\n                            id\n                            price {\n                              amount\n                           }\n                         }\n                       }\n                     }\n                   }\n                 }\n               }\n             }\n           }\n         }\n       }\n    }\n  }\n": {return: DeliveryProfilesQuery, variables: DeliveryProfilesQueryVariables},
  "#graphql\n  query getShopifyFunctions($first: Int) {\n    shopifyFunctions(first: $first) {\n      edges {\n        node {\n          id\n          title\n        }\n      }\n    }\n  }\n": {return: GetShopifyFunctionsQuery, variables: GetShopifyFunctionsQueryVariables},
  "#graphql\n  query ShopInfo($appURLMetafieldKey: String!, $appENVMetafieldNamespace: String!) {\n    shop {\n      id\n      email\n      shopOwnerName\n      currencyCode\n      plan {\n        displayName\n        shopifyPlus\n        partnerDevelopment\n      }\n      ianaTimezone \n      appURLMetafield: metafield(key: $appURLMetafieldKey, namespace: $appENVMetafieldNamespace) {\n        key\n        namespace\n        value\n        definition {\n          access {\n            admin\n            customerAccount\n            storefront\n          }\n        }\n      }\n    }\n    checkoutProfiles(first: 1, query: \"is_published:true\") {\n      nodes {\n        id\n      }\n    }\n    app {\n      id\n    }\n    currentAppInstallation {\n      activeSubscriptions {\n        id\n        trialDays\n        name\n        status\n      }\n    }\n  }\n": {return: ShopInfoQuery, variables: ShopInfoQueryVariables},
  "#graphql\n  query ShopId {\n    shop {\n      id\n    }\n  }\n": {return: ShopIdQuery, variables: ShopIdQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation discountCodeAppCreate(\n   $functionId: String!\n   $title: String!\n   $startsAt: DateTime!\n   $endsAt: DateTime\n   $code: String!\n   $metafields: [MetafieldInput!]!\n   $orderDiscounts: Boolean\n   $productDiscounts: Boolean\n   $shippingDiscounts: Boolean\n   $appliesOncePerCustomer: Boolean\n  ) {\n    discountCodeAppCreate(\n      codeAppDiscount: {\n        functionId: $functionId\n        title: $title\n        startsAt: $startsAt\n        endsAt: $endsAt\n        code: $code\n        metafields: $metafields\n        combinesWith:  {\n           orderDiscounts: $orderDiscounts\n           productDiscounts: $productDiscounts\n           shippingDiscounts: $shippingDiscounts\n        }\n        appliesOncePerCustomer: $appliesOncePerCustomer\n      }\n    ) {\n      codeAppDiscount {\n        discountId\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: DiscountCodeAppCreateMutation, variables: DiscountCodeAppCreateMutationVariables},
  "#graphql\n  mutation discountAutomaticAppCreate(\n   $functionId: String!\n   $title: String!\n   $startsAt: DateTime!\n   $endsAt: DateTime\n   $metafields: [MetafieldInput!]!\n   $orderDiscounts: Boolean\n   $productDiscounts: Boolean\n   $shippingDiscounts: Boolean\n  ) {\n    discountAutomaticAppCreate(\n      automaticAppDiscount: {\n        functionId: $functionId\n        title: $title\n        startsAt: $startsAt\n        endsAt: $endsAt\n        metafields: $metafields\n        combinesWith:  {\n           orderDiscounts: $orderDiscounts\n           productDiscounts: $productDiscounts\n           shippingDiscounts: $shippingDiscounts\n        }    \n      }\n    ) {\n      automaticAppDiscount {\n        discountId\n      }\n      userErrors {\n        message\n      }\n    }\n  }\n": {return: DiscountAutomaticAppCreateMutation, variables: DiscountAutomaticAppCreateMutationVariables},
  "#graphql\n  mutation discountCodeAppDelete($ID: ID!) {\n    discountCodeDelete(id: $ID) {\n      deletedCodeDiscountId\n      userErrors {\n        field\n        code\n        message\n      }\n    }\n  }\n": {return: DiscountCodeAppDeleteMutation, variables: DiscountCodeAppDeleteMutationVariables},
  "#graphql\n  mutation discountAutomaticAppDelete($ID: ID!) {\n    discountAutomaticDelete(id: $ID) {\n      deletedAutomaticDiscountId\n      userErrors {\n        field\n        code\n        message\n      }\n    }\n  }\n": {return: DiscountAutomaticAppDeleteMutation, variables: DiscountAutomaticAppDeleteMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}

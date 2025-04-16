/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CustomersQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type CustomersQuery = { customers: { edges: Array<{ node: Pick<AdminTypes.Customer, 'id' | 'firstName' | 'lastName' | 'createdAt'> }> } };

interface GeneratedQueryTypes {
  "#graphql\n  query customers($first: Int) {\n    customers(first: $first) {\n      edges {\n        node {\n          id\n          firstName\n          lastName\n          createdAt\n\n        }\n      }\n    }\n  }\n": {return: CustomersQuery, variables: CustomersQueryVariables},
}

interface GeneratedMutationTypes {
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}

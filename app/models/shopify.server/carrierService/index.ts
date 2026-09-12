import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_MUTATION_CARRIER_SERVICE_CREATE,
  GRAPHQL_MUTATION_CARRIER_SERVICE_UPDATE,
  GRAPHQL_QUERY_CARRIER_SERVICES,
} from "../graphql/carrierService";

export type CarrierServiceNode = {
  id: string;
  name: string;
  callbackUrl: string | null;
  active: boolean;
};

export type CarrierServiceInput = {
  name: string;
  callbackUrl: string;
  active: boolean;
  supportsServiceDiscovery: boolean;
};

type UserError = { field?: string[] | null; message: string };

/** The Admin client's json() is typed loosely; narrow to what we read. */
type GraphqlBody<T> = { data?: T; errors?: Array<{ message?: string }> };

export class CarrierServiceError extends Error {
  userErrors: UserError[];
  constructor(message: string, userErrors: UserError[] = []) {
    super(message);
    this.name = "CarrierServiceError";
    this.userErrors = userErrors;
  }
}

/** Every carrier service registered on the shop (ours and others). */
export async function getCarrierServices(
  graphql: AdminGraphqlClient,
  first = 50,
): Promise<CarrierServiceNode[]> {
  const response = await graphql(GRAPHQL_QUERY_CARRIER_SERVICES, {
    variables: { first },
  });
  const { data, errors } = (await response.json()) as GraphqlBody<{
    carrierServices?: { nodes?: CarrierServiceNode[] };
  }>;
  if (errors?.length) {
    throw new CarrierServiceError(errors[0].message ?? "Could not list carrier services");
  }
  return data?.carrierServices?.nodes ?? [];
}

export async function createCarrierService(
  graphql: AdminGraphqlClient,
  input: CarrierServiceInput,
): Promise<CarrierServiceNode> {
  const response = await graphql(GRAPHQL_MUTATION_CARRIER_SERVICE_CREATE, {
    variables: { input },
  });
  const { data, errors } = (await response.json()) as GraphqlBody<{
    carrierServiceCreate?: { carrierService?: CarrierServiceNode | null; userErrors?: UserError[] };
  }>;
  if (errors?.length) {
    throw new CarrierServiceError(errors[0].message ?? "Could not create the carrier service");
  }
  const payload = data?.carrierServiceCreate;
  if (!payload?.carrierService) {
    throw new CarrierServiceError(
      payload?.userErrors?.[0]?.message ?? "Could not create the carrier service",
      payload?.userErrors ?? [],
    );
  }
  return payload.carrierService;
}

export async function updateCarrierService(
  graphql: AdminGraphqlClient,
  input: CarrierServiceInput & { id: string },
): Promise<CarrierServiceNode> {
  const response = await graphql(GRAPHQL_MUTATION_CARRIER_SERVICE_UPDATE, {
    variables: { input },
  });
  const { data, errors } = (await response.json()) as GraphqlBody<{
    carrierServiceUpdate?: { carrierService?: CarrierServiceNode | null; userErrors?: UserError[] };
  }>;
  if (errors?.length) {
    throw new CarrierServiceError(errors[0].message ?? "Could not update the carrier service");
  }
  const payload = data?.carrierServiceUpdate;
  if (!payload?.carrierService) {
    throw new CarrierServiceError(
      payload?.userErrors?.[0]?.message ?? "Could not update the carrier service",
      payload?.userErrors ?? [],
    );
  }
  return payload.carrierService;
}

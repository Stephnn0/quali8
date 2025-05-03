import type { getManyConditions } from "app/models/app.server/conditions/conditions.server";
import type { getManyCustomers } from "app/models/app.server/customers/customer.server";
import type { getQualifierById } from "app/models/app.server/qualifiers/qualifier.server";

type QualifiersWithCustomersAndConditions =
  | (Awaited<ReturnType<typeof getQualifierById>> & {
      conditions: Awaited<ReturnType<typeof getManyConditions>>;
      customers: Awaited<ReturnType<typeof getManyCustomers>>;
    })
  | null;

export type QualifiersOnlyLoaderData = {
  qualifier: Awaited<ReturnType<typeof getQualifierById>> | null;
};

export type QualifierLoaderData = {
  qualifier: QualifiersWithCustomersAndConditions;
};

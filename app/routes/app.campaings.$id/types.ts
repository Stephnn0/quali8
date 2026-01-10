import type { Prisma } from "@prisma/client";
import { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";

type CampaignWithRelations = Prisma.CampaignGetPayload<{
  include: {
    audiences: true;
    promotions: true;
    holiday: true;
  };
}> | null;

export type CampaignLoaderData = {
  campaing: CampaignWithRelations;
  qualifiers: Awaited<ReturnType<typeof getQualifiersByShop>>;
};

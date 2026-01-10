import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

/**
 * CREATE
 */
export async function createCampaign(
  prismaArgs: Prisma.CampaignCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const campaign = await db.campaign.create(prismaArgs);
    return campaign;
  } catch (error) {
    console.error("Error creating campaign:", error);
    throw error;
  }
}

/**
 * GET ALL (basic)
 */
export async function getAllCampaigns(
  prismaArgs: Prisma.CampaignFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const campaigns = await db.campaign.findMany(prismaArgs);
    return campaigns;
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    throw error;
  }
}

/**
 * GET BY SHOP (with count)
 */
export async function getCampaignsByShop(
  prismaArgs: Prisma.CampaignFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const [campaigns, campaignsCount] = await db.$transaction([
      db.campaign.findMany(prismaArgs),
      db.campaign.count({ where: prismaArgs.where || {} }),
    ]);

    return { campaigns, campaignsCount };
  } catch (error) {
    console.error("Error fetching campaigns by shop:", error);
    throw error;
  }
}

/**
 * GET BY SHOP (with relations)
 */
export async function getCampaignsByShopWithRelations(
  prismaArgs: Prisma.CampaignFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const [campaigns, campaignsCount] = await db.$transaction([
      db.campaign.findMany({
        ...prismaArgs,
        include: {
          audiences: true,
          promotions: true,
          holiday: true,
        },
      }),
      db.campaign.count({ where: prismaArgs.where || {} }),
    ]);

    return { campaigns, campaignsCount };
  } catch (error) {
    console.error("Error fetching campaigns with relations:", error);
    throw error;
  }
}

/**
 * GET BY ID (shop scoped, with relations)
 */
export async function getCampaignByIdWithRelations(
  shop: string,
  id: string,
  db: PrismaClient,
) {
  try {
    const campaign = await db.campaign.findUnique({
      where: {
        id: Number(id),
        shop,
      },
      include: {
        audiences: true,
        promotions: true,
        holiday: true,
      },
    });

    return campaign;
  } catch (error) {
    console.error("Error fetching campaign:", error);
    throw error;
  }
}

/**
 * GET BY ID (generic)
 */
export async function getCampaignById(
  prismaArgs: Prisma.CampaignFindUniqueArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const campaign = await db.campaign.findUnique(prismaArgs);
    return campaign;
  } catch (error) {
    console.error("Error fetching campaign:", error);
    throw error;
  }
}

/**
 * UPDATE
 */
export async function updateCampaign(
  prismaArgs: Prisma.CampaignUpdateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const campaign = await db.campaign.update(prismaArgs);
    return campaign;
  } catch (error) {
    console.error("Error updating campaign:", error);
    throw error;
  }
}

/**
 * DELETE
 */
export async function deleteCampaign(
  prismaArgs: Prisma.CampaignDeleteArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const campaign = await db.campaign.delete(prismaArgs);
    return campaign;
  } catch (error) {
    console.error("Error deleting campaign:", error);
    throw error;
  }
}

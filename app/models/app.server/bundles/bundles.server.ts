import type { BundleStatus, Prisma, PrismaClient } from "@prisma/client";

/**
 * Data layer for product bundles (classic percentage bundles).
 * Every query is scoped by `shop` — never expose a lookup that isn't.
 */

export type BundleItemInput = {
  variantId: string;
  productId?: string | null;
  quantity: number;
  position: number;
  productTitle: string;
  variantTitle?: string | null;
  price: number;
  imageUrl?: string | null;
};

export type BundleUpsertInput = {
  title: string;
  description?: string | null;
  status: BundleStatus;
  discountPercent: number;
  items: BundleItemInput[];
};

export async function getBundlesByShop(
  prismaArgs: Prisma.BundleFindManyArgs,
  db: PrismaClient,
) {
  try {
    const [bundles, bundlesCount] = await db.$transaction([
      db.bundle.findMany({
        ...prismaArgs,
        include: {
          items: { orderBy: { position: "asc" } },
        },
      }),
      db.bundle.count({ where: prismaArgs.where || {} }),
    ]);

    return { bundles, bundlesCount };
  } catch (error) {
    console.error("Error fetching bundles:", error);
    throw error;
  }
}

export async function getBundleByIdForShop(
  shop: string,
  id: number,
  db: PrismaClient,
) {
  try {
    return await db.bundle.findFirst({
      where: { id, shop },
      include: {
        items: { orderBy: { position: "asc" } },
      },
    });
  } catch (error) {
    console.error("Error fetching bundle:", error);
    throw error;
  }
}

/**
 * The single bundle the storefront should render on a product's page: ACTIVE
 * and containing that product among its items. Newest-updated wins when the
 * product appears in more than one active bundle.
 */
export async function getActiveBundleForProduct(
  shop: string,
  productId: string,
  db: PrismaClient,
) {
  try {
    return await db.bundle.findFirst({
      where: {
        shop,
        status: "ACTIVE",
        items: { some: { productId } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        items: { orderBy: { position: "asc" } },
      },
    });
  } catch (error) {
    console.error("Error fetching active bundle for product:", error);
    throw error;
  }
}

/** All ACTIVE bundles for a shop — the source of the discount metafield. */
export async function getActiveBundlesForShop(shop: string, db: PrismaClient) {
  try {
    return await db.bundle.findMany({
      where: { shop, status: "ACTIVE" },
      include: { items: { orderBy: { position: "asc" } } },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    console.error("Error fetching active bundles:", error);
    throw error;
  }
}

export async function createBundle(
  shop: string,
  input: BundleUpsertInput,
  db: PrismaClient,
) {
  try {
    return await db.bundle.create({
      data: {
        shop,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        discountPercent: input.discountPercent,
        items: { create: input.items },
      },
      include: { items: { orderBy: { position: "asc" } } },
    });
  } catch (error) {
    console.error("Error creating bundle:", error);
    throw error;
  }
}

/**
 * Full replace: bundle fields are updated and items are recreated from the
 * input (simplest correct semantics for a small list).
 */
export async function updateBundle(
  shop: string,
  id: number,
  input: BundleUpsertInput,
  db: PrismaClient,
) {
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.bundle.findFirst({ where: { id, shop } });
      if (!existing) return null;

      await tx.bundleItem.deleteMany({ where: { bundleId: id } });

      return tx.bundle.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          discountPercent: input.discountPercent,
          items: { create: input.items },
        },
        include: { items: { orderBy: { position: "asc" } } },
      });
    });
  } catch (error) {
    console.error("Error updating bundle:", error);
    throw error;
  }
}

export async function setBundleStatus(
  shop: string,
  id: number,
  status: BundleStatus,
  db: PrismaClient,
) {
  try {
    const result = await db.bundle.updateMany({
      where: { id, shop },
      data: { status },
    });
    return result.count > 0 ? db.bundle.findFirst({ where: { id, shop } }) : null;
  } catch (error) {
    console.error("Error setting bundle status:", error);
    throw error;
  }
}

export async function deleteBundle(shop: string, id: number, db: PrismaClient) {
  try {
    // deleteMany so a wrong-shop id is a no-op instead of a thrown P2025.
    return await db.bundle.deleteMany({ where: { id, shop } });
  } catch (error) {
    console.error("Error deleting bundle:", error);
    throw error;
  }
}

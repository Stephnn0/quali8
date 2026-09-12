import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const monthSchema = z.number().int().min(1).max(12).nullable();
const daySchema = z.number().int().min(1).max(31).nullable();

const saveOccasionSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  startMonth: monthSchema,
  startDay: daySchema,
  endMonth: monthSchema,
  endDay: daySchema,
  products: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1),
      title: z.string(),
      price: z.number(),
      imageUrl: z.string().nullable(),
    }),
  ),
  collections: z.array(
    z.object({
      collectionId: z.string().startsWith("gid://shopify/Collection/"),
      title: z.string(),
      handle: z.string().nullable(),
      imageUrl: z.string().nullable(),
    }),
  ),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "occasion"
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute(
      { authAdminContext },
      { hasRecommendations: true },
      "throw",
    );

    const formData = await request.formData();
    const body = saveOccasionSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    // A window must be complete or absent
    const hasStart = body.startMonth !== null;
    const hasEnd = body.endMonth !== null;
    if (hasStart !== hasEnd) {
      return handleApiError({
        errors: [{ message: "Set both start and end of the window, or neither" }],
        code: "invalid",
      });
    }

    const shared = {
      name: body.name,
      status: body.status,
      startMonth: body.startMonth,
      startDay: body.startMonth ? (body.startDay ?? 1) : null,
      endMonth: body.endMonth,
      endDay: body.endMonth ? (body.endDay ?? 28) : null,
    };

    const products = body.products.map((product, index) => ({
      productId: product.productId,
      variantId: product.variantId,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      position: index,
    }));

    const collections = body.collections.map((collection, index) => ({
      collectionId: collection.collectionId,
      title: collection.title,
      handle: collection.handle,
      imageUrl: collection.imageUrl,
      position: index,
    }));

    if (body.id === null) {
      // Slug must be unique per shop — suffix on collision
      const base = slugify(body.name);
      const clashes = await db.occasion.count({
        where: { shop: session.shop, slug: { startsWith: base } },
      });
      const slug = clashes === 0 ? base : `${base}-${clashes + 1}`;

      await db.occasion.create({
        data: {
          ...shared,
          slug,
          shop: session.shop,
          products: { create: products },
          collections: { create: collections },
        },
      });
    } else {
      const owned = await db.occasion.findFirst({
        where: { id: body.id, shop: session.shop },
        select: { id: true },
      });
      if (!owned) {
        return handleApiError({
          errors: [{ message: "Occasion not found" }],
          code: "not_found",
        });
      }

      await db.occasion.update({
        where: { id: owned.id },
        data: {
          ...shared,
          // Replace the product snapshot wholesale (BundleItem pattern)
          products: { deleteMany: {}, create: products },
          collections: { deleteMany: {}, create: collections },
        },
      });
    }

    return { code: "saved", errors: null };
  } catch (error) {
    console.error("Error saving occasion:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}

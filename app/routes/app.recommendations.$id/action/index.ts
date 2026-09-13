import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const gid = (kind: string) => z.string().startsWith(`gid://shopify/${kind}/`);
const optionalMoney = z.number().min(0).nullable();

const saveRuleSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1, "Name is required").max(80),
  heading: z.string().trim().max(80).nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  trigger: z.enum([
    "ALWAYS",
    "CART_HAS_COLLECTION",
    "CART_HAS_PRODUCT",
    "CART_TOTAL_MIN",
    "VIEWED_COLLECTION",
    "VIEWED_PRODUCT",
    "RETURNING_VISITOR",
  ]),
  triggerCollectionId: gid("Collection").nullable(),
  triggerCollectionTitle: z.string().nullable(),
  triggerProductId: gid("Product").nullable(),
  triggerProductTitle: z.string().nullable(),
  triggerMinTotal: optionalMoney,
  source: z.enum([
    "COLLECTION",
    "TAG",
    "NEWEST",
    "PRODUCTS",
    "RECENTLY_VIEWED",
    "RELATED_TO_VIEWED",
  ]),
  sourceCollectionId: gid("Collection").nullable(),
  sourceCollectionTitle: z.string().nullable(),
  sourceTag: z.string().trim().max(80).nullable(),
  sourceProducts: z
    .array(
      z.object({
        productId: gid("Product"),
        title: z.string(),
        imageUrl: z.string().nullable(),
      }),
    )
    .max(12),
  minPrice: optionalMoney,
  maxPrice: optionalMoney,
  limit: z.number().int().min(1).max(12),
  excludeCartItems: z.boolean(),
});

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
    const body = saveRuleSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    // The trigger and the source must each have what they need
    const problems: string[] = [];
    const needsCollection =
      body.trigger === "CART_HAS_COLLECTION" || body.trigger === "VIEWED_COLLECTION";
    const needsProduct =
      body.trigger === "CART_HAS_PRODUCT" || body.trigger === "VIEWED_PRODUCT";
    if (needsCollection && !body.triggerCollectionId) {
      problems.push(
        body.trigger === "CART_HAS_COLLECTION"
          ? "Choose the collection the cart must contain"
          : "Choose the collection the shopper must have viewed",
      );
    }
    if (needsProduct && !body.triggerProductId) {
      problems.push(
        body.trigger === "CART_HAS_PRODUCT"
          ? "Choose the product the cart must contain"
          : "Choose the product the shopper must have viewed",
      );
    }
    if (body.trigger === "CART_TOTAL_MIN" && body.triggerMinTotal === null) {
      problems.push("Enter the minimum cart total");
    }
    if (body.source === "COLLECTION" && !body.sourceCollectionId) {
      problems.push("Choose the collection to recommend from");
    }
    if (body.source === "TAG" && !body.sourceTag) {
      problems.push("Enter the tag to recommend from");
    }
    if (body.source === "PRODUCTS" && body.sourceProducts.length === 0) {
      problems.push("Pick at least one product to recommend");
    }
    if (
      body.minPrice !== null &&
      body.maxPrice !== null &&
      body.minPrice > body.maxPrice
    ) {
      problems.push("The minimum price must be below the maximum");
    }
    if (problems.length) {
      return handleApiError({
        errors: problems.map((message) => ({ message })),
        code: "invalid",
      });
    }

    const data = {
      name: body.name,
      heading: body.heading || null,
      status: body.status,
      trigger: body.trigger,
      triggerCollectionId: needsCollection ? body.triggerCollectionId : null,
      triggerCollectionTitle: needsCollection ? body.triggerCollectionTitle : null,
      triggerProductId: needsProduct ? body.triggerProductId : null,
      triggerProductTitle: needsProduct ? body.triggerProductTitle : null,
      triggerMinTotal: body.trigger === "CART_TOTAL_MIN" ? body.triggerMinTotal : null,
      source: body.source,
      sourceCollectionId: body.source === "COLLECTION" ? body.sourceCollectionId : null,
      sourceCollectionTitle: body.source === "COLLECTION" ? body.sourceCollectionTitle : null,
      sourceTag: body.source === "TAG" ? body.sourceTag : null,
      sourceProducts: body.source === "PRODUCTS" ? body.sourceProducts : [],
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      limit: body.limit,
      excludeCartItems: body.excludeCartItems,
    };

    if (body.id === null) {
      const position = await db.recommendationRule.count({
        where: { shop: session.shop },
      });
      await db.recommendationRule.create({
        data: { ...data, position, shop: session.shop },
      });
    } else {
      const owned = await db.recommendationRule.findFirst({
        where: { id: body.id, shop: session.shop },
        select: { id: true },
      });
      if (!owned) {
        return handleApiError({
          errors: [{ message: "Rule not found" }],
          code: "not_found",
        });
      }
      await db.recommendationRule.update({ where: { id: owned.id }, data });
    }

    return { code: "saved", errors: null };
  } catch (error) {
    console.error("Error saving recommendation rule:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}

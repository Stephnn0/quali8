import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { applySeo, listSeoResources } from "app/models/shopify.server/seo";
import {
  generateSeoSuggestions,
  SEO_BATCH_LIMIT,
} from "app/services/assistant/seoMeta.server";

const resourceType = z.enum(["PRODUCT", "COLLECTION"]);

/** GET /api/seo-meta?type=PRODUCT&search=roses — browse resources. */
export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

  const url = new URL(request.url);
  const type = resourceType.catch("PRODUCT").parse(url.searchParams.get("type"));
  const search = (url.searchParams.get("search") ?? "").slice(0, 80);

  try {
    const items = await listSeoResources(
      authAdminContext.admin.graphql,
      type,
      search,
    );
    return { items, errors: null };
  } catch (error) {
    console.error("SEO resource listing failed:", error);
    return { items: [], errors: [{ message: "Could not load resources" }] };
  }
}

const suggestSchema = z.object({
  action: z.literal("suggest"),
  specialDateId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        seoTitle: z.string().nullable(),
        seoDescription: z.string().nullable(),
      }),
    )
    .min(1)
    .max(SEO_BATCH_LIMIT),
});

const applySchema = z.object({
  action: z.literal("apply"),
  specialDateId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        type: resourceType,
        resourceTitle: z.string().min(1),
        previousSeoTitle: z.string().nullable(),
        previousSeoDescription: z.string().nullable(),
        seoTitle: z.string().trim().min(1).max(70),
        seoDescription: z.string().trim().min(1).max(180),
      }),
    )
    .min(1)
    .max(SEO_BATCH_LIMIT),
});

const bodySchema = z.discriminatedUnion("action", [suggestSchema, applySchema]);

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    // The special date must belong to this shop
    const specialDate = await db.specialDate.findFirst({
      where: { id: body.specialDateId, shop: session.shop },
    });
    if (!specialDate) {
      return { code: "not-found", errors: [{ message: "Special date not found" }] };
    }

    if (body.action === "suggest") {
      const profile = await db.storeProfile.findUnique({
        where: { shop: session.shop },
      });
      const suggestions = await generateSeoSuggestions(
        db,
        session.shop,
        {
          dateName: specialDate.name,
          date: specialDate.date,
          nicheLabel: profile?.nicheLabel ?? "Shopify",
          country: profile?.country ?? null,
        },
        body.items,
      );
      if (!suggestions) {
        return {
          code: "ai-unavailable",
          errors: [{ message: "The AI is unavailable right now — try again shortly" }],
        };
      }
      return { code: "suggested", suggestions, errors: null };
    }

    // apply — one mutation per resource, each with its own audit row
    const results: Array<{ id: string; ok: boolean; message: string | null }> = [];
    for (const item of body.items) {
      const errorMessage = await applySeo(admin.graphql, item.type, item.id, {
        title: item.seoTitle,
        description: item.seoDescription,
      });
      if (!errorMessage) {
        await db.seoMetaAction.create({
          data: {
            shop: session.shop,
            specialDateId: specialDate.id,
            resourceType: item.type,
            resourceId: item.id,
            resourceTitle: item.resourceTitle,
            previousSeoTitle: item.previousSeoTitle,
            previousSeoDescription: item.previousSeoDescription,
            newSeoTitle: item.seoTitle,
            newSeoDescription: item.seoDescription,
          },
        });
      }
      results.push({ id: item.id, ok: !errorMessage, message: errorMessage });
    }
    return { code: "applied", results, errors: null };
  } catch (error) {
    console.error("SEO meta action error:", error);
    return { code: "error", errors: [{ message: "Something went wrong. Try again." }] };
  }
}

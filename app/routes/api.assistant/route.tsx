import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { isNicheSlug, nicheLabel } from "app/services/assistant/taxonomy";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const confirmProfileSchema = z.object({
  action: z.literal("confirm-profile"),
  niche: z.string().min(1),
  nicheLabel: z.string().trim().min(1).max(60),
  country: z.string().trim().max(60).optional(),
  note: z.string().trim().max(300).optional(),
});

const toggleTaskSchema = z.object({
  action: z.literal("toggle-task"),
  id: z.string().min(1).max(60),
  done: z.boolean(),
});

const refreshSchema = z.object({ action: z.literal("refresh") });

const bodySchema = z.discriminatedUnion("action", [
  confirmProfileSchema,
  toggleTaskSchema,
  refreshSchema,
]);

/**
 * Assistant dashboard mutations. The app._index loader re-runs after each
 * fetcher submission (React Router revalidation), so actions only persist —
 * the loader rebuilds profile + brief.
 */
export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    if (body.action === "confirm-profile") {
      const niche = isNicheSlug(body.niche) ? body.niche : "other";
      const label =
        niche === "other" ? body.nicheLabel : nicheLabel(niche);

      await db.storeProfile.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          niche,
          nicheLabel: label,
          country: body.country || null,
          note: body.note || null,
        },
        update: {
          niche,
          nicheLabel: label,
          country: body.country || null,
          note: body.note || null,
        },
      });

      // Force regeneration on next load by aging out any cached brief
      await db.dashboardBrief.deleteMany({ where: { shop: session.shop } });
      return { code: "profile-saved", errors: null };
    }

    if (body.action === "toggle-task") {
      const profile = await db.storeProfile.findUnique({
        where: { shop: session.shop },
      });
      if (!profile) {
        return handleApiError({
          errors: [{ message: "Set up your profile first" }],
          code: "no-profile",
        });
      }
      const done = new Set(profile.checklistDone);
      if (body.done) {
        done.add(body.id);
      } else {
        done.delete(body.id);
      }
      await db.storeProfile.update({
        where: { shop: session.shop },
        data: { checklistDone: [...done] },
      });
      return { code: "task-updated", errors: null };
    }

    // refresh — age out the cached brief; the loader regenerates
    await db.dashboardBrief.deleteMany({ where: { shop: session.shop } });
    return { code: "refreshing", errors: null };
  } catch (error) {
    console.error("Assistant action error:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}

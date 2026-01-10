import { SubscriptionStatus, type PrismaClient } from "@prisma/client";
import type { AuthWebhookContext } from "./types";
import { appSubscriptionModel } from "app/models/shopify.server/appSubscription";
import { shopifySubscriptionModel } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import type { ZodType } from "zod";
import { z } from "zod";

export async function handleAppSubscriptionUpdateWebhook(
  db: PrismaClient,
  authWebhookContext: AuthWebhookContext,
) {
  const { payload: unsafePayload, admin, webhookId } = authWebhookContext || {};

  try {
    if (!admin)
      throw new Error(
        `${webhookId} - No admin context available for this webhook.`,
      );

    // Parse the incoming webhook payload
    const data = zodAppSubscriptionPayload.parse(unsafePayload);

    // Fetch the subscription data with more details
    const subscription = await appSubscriptionModel.find(authWebhookContext, {
      id: data.app_subscription.admin_graphql_api_id,
    });
    if (!subscription)
      throw new Error(
        `${webhookId} - Failed to fetch subscription via GraphQL`,
      );

    // Upsert the subscription
    await shopifySubscriptionModel.syncSubscription(
      db,
      authWebhookContext,
      subscription,
      webhookId,
    );
    //
  } catch (error) {
    console.error(
      `${webhookId} - Error in appSubscriptionUpdateWebhookHandler`,
    );
  }
}

export const zodAppSubscriptionPayload = z.object({
  app_subscription: z.object({
    name: z.string(),
    status: z.nativeEnum(SubscriptionStatus),
    currency: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    capped_amount: z.string().nullable(),
    admin_graphql_api_id: z.string(),
    admin_graphql_api_shop_id: z.string(),
  }),
}) satisfies ZodType<AppSubscriptionUpdatePayload>;

export type AppSubscriptionUpdatePayload = {
  app_subscription: {
    name: string;
    status: SubscriptionStatus;
    currency: string;
    created_at: string;
    updated_at: string;
    capped_amount: string | null;
    admin_graphql_api_id: string;
    admin_graphql_api_shop_id: string;
  };
};

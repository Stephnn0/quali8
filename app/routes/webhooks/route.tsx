import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { handleAppUninstalledWebhook } from "./handlers/handleAppUninstalledWebhook.server";
import { handleAppSubscriptionUpdateWebhook } from "./handlers/handleAppSubscriptionUpdate.server";
import db from "app/db.server";
import { handleShopRedactWebhook } from "./handlers/handleShopRedactWebhook.server";
import { syncSubscriptionFromPayload } from "app/services/billing.server/syncSubscriptionFromPayload.server";

/**
 * Shopify counts every non-2xx answer as a failed delivery, retries it up
 * to 19 times over 48 hours, and surfaces the failure rate in the Partner
 * Dashboard. So this route answers 200 for every authenticated webhook,
 * including topics it has no handler for, and keeps handler failures out
 * of the status code: they are logged, and the data is reconciled by the
 * sync paths described in CLAUDE.md. Only an invalid HMAC (401, thrown by
 * `authenticate.webhook`) is a real failure.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const authWebhookContext = await authenticate.webhook(request);
  const { topic, admin, shop, webhookId, payload, apiVersion, session } =
    authWebhookContext;

  const webhookObject = {
    event: "Webhook received",
    processID: webhookId,
    shop,
    topic,
    payload,
    apiVersion,
  };

  console.log(JSON.stringify(webhookObject, null, 2));

  if (!admin && topic !== "SHOP_REDACT") {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
    // Because of this, no admin context is available.
    //
    // It is also missing when the shop has no offline session *yet* (the
    // merchant subscribed before the app finished installing). We must
    // answer 200 so Shopify stops retrying, so a subscription event is
    // saved from its payload instead of being lost; everything else is
    // dropped with a warning.
    if (topic === "APP_SUBSCRIPTIONS_UPDATE") {
      const result = await syncSubscriptionFromPayload(db, shop, payload, webhookId);
      if (!result.ok) {
        console.warn(`${webhookId} - ${topic} for ${shop} not saved from payload: ${result.reason}`); // eslint-disable-line no-console
      }
    } else {
      console.warn(`${webhookId} - Dropping ${topic} for ${shop}: no offline session`); // eslint-disable-line no-console
    }
    throw new Response();
  }

  try {
    switch (topic) {
      case "APP_UNINSTALLED":
        await handleAppUninstalledWebhook(authWebhookContext);
        break;

      case "APP_SUBSCRIPTIONS_UPDATE":
        await handleAppSubscriptionUpdateWebhook(db, authWebhookContext);
        break;

      case "APP_SCOPES_UPDATE": {
        // The merchant granted (or lost) scopes: keep the offline session's
        // scope list current so `session.scope` checks see the new grant.
        const current = (payload as { current?: unknown }).current;
        if (session && Array.isArray(current)) {
          await db.session.update({
            where: { id: session.id },
            data: { scope: current.map(String).join(",") },
          });
        }
        break;
      }

      case "SHOP_REDACT":
        console.log("Received SHOP_REDACT webhook");
        await handleShopRedactWebhook(authWebhookContext);
        break;

      case "CUSTOMERS_REDACT":
      case "CUSTOMERS_DATA_REQUEST":
        // The app stores no customer data beyond what Shopify already holds
        // for the shop; nothing to export or erase.
        break;

      default:
        // A topic the config subscribes to but this route does not handle
        // yet. A 404 here is counted as a failed delivery and retried for
        // two days, so acknowledge it and log it instead.
        console.warn(`${webhookId} - No handler for webhook topic ${topic} (${shop})`); // eslint-disable-line no-console
    }
  } catch (error) {
    console.error(`${webhookId} - Webhook handler for ${topic} failed (${shop})`, error); // eslint-disable-line no-console
  }

  return new Response();
};

// https://shopify.dev/docs/apps/build/privacy-law-compliance

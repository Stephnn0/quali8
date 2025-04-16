import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { handleAppUninstalledWebhook } from "./handlers/handleAppUninstalledWebhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const authWebhookContext = await authenticate.webhook(request);
  const { topic, admin, shop, webhookId, payload, apiVersion } =
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
    throw new Response();
  }

  // TODO - better error handling strategy for webhooks
  switch (topic) {
    case "APP_UNINSTALLED":
      await handleAppUninstalledWebhook(authWebhookContext);
      break;

    case "SHOP_REDACT":
      console.log("Received SHOP_REDACT webhook");
      break;

    case "CUSTOMERS_REDACT":
      return json({
        message: "Customer data redaction processed successfully.",
        status: 200,
      });

    case "CUSTOMERS_DATA_REQUEST":
      return json({
        message: "Customer data request processed successfully.",
        status: 200,
      });

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  // ? Should we return or throw the response here?
  return new Response();
};

// https://shopify.dev/docs/apps/build/privacy-law-compliance

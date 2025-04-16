import type { AuthWebhookContext } from "./types";

export async function handleAppUninstalledWebhook(
  authWebhookContext: AuthWebhookContext,
) {
  const { session, shop, webhookId } = authWebhookContext;

  console.log(shop);

  try {
    if (session) {
      //   await deleteShopifySession(shop);
    }
  } catch (error) {
    console.error(`${webhookId} - Error in appUninstalledWebhookHandler`); // eslint-disable-line no-console
  }
}

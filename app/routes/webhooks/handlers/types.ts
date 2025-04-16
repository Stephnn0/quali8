import type { authenticate } from "app/shopify.server";

export type AuthWebhookContext = Awaited<
  ReturnType<typeof authenticate.webhook>
>;

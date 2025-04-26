import type { authenticate } from "app/shopify.server";

export type AuthAdminContext = Awaited<ReturnType<typeof authenticate.admin>>;

export type AuthWebhookContext = Awaited<
  ReturnType<typeof authenticate.webhook>
>;

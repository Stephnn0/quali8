import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Shopify's signature on a carrier service callback: the
 * `X-Shopify-Hmac-Sha256` header is a base64 HMAC-SHA256 of the raw body,
 * keyed with the app's API secret. Returns the raw body when valid.
 */
export async function verifyCarrierRequest(
  request: Request,
): Promise<{ valid: boolean; body: string }> {
  const body = await request.clone().text();
  const header = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const secret = process.env.SHOPIFY_API_SECRET ?? "";
  if (!header || !secret) return { valid: false, body };

  const expected = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  return { valid, body };
}

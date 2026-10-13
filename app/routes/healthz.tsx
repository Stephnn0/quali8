import { sessionStorage } from "app/shopify.server";

/**
 * Startup / readiness probe for Cloud Run. Returns 200 only once the
 * Prisma session storage can reach the `Session` table, which is what
 * every authenticated request and every webhook needs first. `isReady()`
 * re-runs the table probe and replaces the cached result, so an instance
 * whose first probe failed (slow database at cold start) heals here
 * instead of answering 500 until it is recycled.
 */
export const loader = async () => {
  const ready = await sessionStorage.isReady();
  return new Response(ready ? "ok" : "session storage not ready", {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" },
  });
};

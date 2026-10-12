import { describe, expect, it } from "vitest";
import { mapSubscriptionPayload } from "./subscriptionPayload";

const payload = {
  app_subscription: {
    admin_graphql_api_id: "gid://shopify/AppSubscription/75619860797",
    name: "Advance",
    status: "ACTIVE" as const,
    admin_graphql_api_shop_id: "gid://shopify/Shop/98693120317",
    created_at: "2026-10-08T10:31:56-04:00",
    updated_at: "2026-10-08T10:31:56-04:00",
    currency: "USD",
    capped_amount: null,
    price: "25.00",
    interval: "every_30_days",
    plan_handle: "advance",
  },
};

describe("mapSubscriptionPayload", () => {
  it("maps the Advance webhook payload to a subscription row", () => {
    const mapped = mapSubscriptionPayload(payload);
    expect(mapped).toEqual({
      shopifyId: "gid://shopify/AppSubscription/75619860797",
      name: "Advance",
      status: "ACTIVE",
      startDate: new Date("2026-10-08T14:31:56Z"),
      currentPeriodEnd: new Date("2026-11-07T14:31:56Z"),
      planLevel: "ADVANCE",
      trialDays: 5,
      pricing: { price: 25, currencyCode: "USD", interval: "EVERY_30_DAYS" },
      test: false,
    });
  });

  it("understands annual intervals and the free handle", () => {
    const mapped = mapSubscriptionPayload({
      app_subscription: {
        ...payload.app_subscription,
        name: "Free",
        price: "0.00",
        interval: "annual",
        plan_handle: "free",
      },
    });
    expect(mapped?.planLevel).toBe("FREE");
    expect(mapped?.trialDays).toBeNull();
    expect(mapped?.pricing).toEqual({ price: 0, currencyCode: "USD", interval: "ANNUAL" });
    expect(mapped?.currentPeriodEnd).toEqual(new Date("2027-10-08T14:31:56Z"));
  });

  it("falls back to the subscription name when the handle is unknown", () => {
    const mapped = mapSubscriptionPayload({
      app_subscription: { ...payload.app_subscription, plan_handle: "something-else" },
    });
    expect(mapped?.planLevel).toBe("ADVANCE");
  });

  it("returns null without a price or interval", () => {
    expect(
      mapSubscriptionPayload({
        app_subscription: { ...payload.app_subscription, price: undefined, interval: undefined },
      }),
    ).toBeNull();
  });

  it("has no period end for a cancelled subscription", () => {
    const mapped = mapSubscriptionPayload({
      app_subscription: { ...payload.app_subscription, status: "CANCELLED" },
    });
    expect(mapped?.currentPeriodEnd).toBeNull();
    expect(mapped?.status).toBe("CANCELLED");
  });
});

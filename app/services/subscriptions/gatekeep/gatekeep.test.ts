import { describe, expect, it } from "vitest";
import { gatekeep } from "./gatekeep";
import type { GateKeepArgs } from "./types";
import { APP_PLANS } from "app/constants/plans";

type Plan = NonNullable<GateKeepArgs["current"]["subscription"]["recurringPlan"]>;

function current(
  plan: Partial<Plan>,
  context: Partial<GateKeepArgs["current"]> = {},
): GateKeepArgs["current"] {
  const recurringPlan = {
    ...APP_PLANS.FREE,
    code: "free-monthly",
    interval: "EVERY_30_DAYS",
    read_generalApis: false,
    write_generalApis: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...plan,
  };
  return {
    shop: "test.myshopify.com",
    shopPlan: "Basic Shopify",
    isDevStore: false,
    subscription: {
      name: recurringPlan.name,
      status: "ACTIVE",
      recurringPlan,
      shopifyRecurringPricing: null,
    } as unknown as GateKeepArgs["current"]["subscription"],
    ...context,
  };
}

describe("gatekeep feature flags", () => {
  it("lets the Free plan into announcements, zones, popup, and bundles", () => {
    const free = current({});
    expect(gatekeep({ current: free, criteria: { hasAnnouncements: true } })).toBeNull();
    expect(gatekeep({ current: free, criteria: { hasDeliveryZones: true } })).toBeNull();
    expect(gatekeep({ current: free, criteria: { hasSubscribePopup: true } })).toBeNull();
    expect(gatekeep({ current: free, criteria: { hasBundles: true } })).toBeNull();
  });

  it("keeps the Free plan out of shipping discounts and the AI tools", () => {
    const free = current({});
    expect(gatekeep({ current: free, criteria: { hasShippingDiscounts: true } })).toBe("AP007");
    expect(gatekeep({ current: free, criteria: { hasAssistant: true } })).toBe("AP016");
  });

  it("returns the new codes when a plan lacks the flag", () => {
    const bare = current({
      hasAnnouncements: false,
      hasDeliveryZones: false,
      hasSubscribePopup: false,
    });
    expect(gatekeep({ current: bare, criteria: { hasAnnouncements: true } })).toBe("AP017");
    expect(gatekeep({ current: bare, criteria: { hasDeliveryZones: true } })).toBe("AP018");
    expect(gatekeep({ current: bare, criteria: { hasSubscribePopup: true } })).toBe("AP019");
  });
});

describe("gatekeep plan limits", () => {
  it("allows a bundle under the limit and blocks at the limit", () => {
    expect(
      gatekeep({
        current: current({ bundleLimit: 1 }, { bundleAmount: 0 }),
        criteria: { hasBundles: true, bundleLimit: true },
      }),
    ).toBeNull();
    expect(
      gatekeep({
        current: current({ bundleLimit: 1 }, { bundleAmount: 1 }),
        criteria: { hasBundles: true, bundleLimit: true },
      }),
    ).toBe("AP020");
  });

  it("never blocks an unlimited plan", () => {
    expect(
      gatekeep({
        current: current({ ...APP_PLANS.ADVANCE }, { bundleAmount: 99, popupSignupAmount: 99999 }),
        criteria: { bundleLimit: true, popupSignupLimit: true },
      }),
    ).toBeNull();
  });

  it("blocks popup signups once the monthly cap is used up", () => {
    expect(
      gatekeep({
        current: current({ popupSignupLimit: 200 }, { popupSignupAmount: 200 }),
        criteria: { popupSignupLimit: true },
      }),
    ).toBe("AP021");
  });

  it("ignores the limit when the caller did not ask for it", () => {
    expect(
      gatekeep({
        current: current({ bundleLimit: 1 }, { bundleAmount: 5 }),
        criteria: { hasBundles: true },
      }),
    ).toBeNull();
  });
});

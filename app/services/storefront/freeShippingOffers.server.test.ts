import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock(
  "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server",
  () => ({ getManyShippingDiscountActionsNotCount: vi.fn() }),
);
vi.mock("app/models/app.server/customers/customer.server", () => ({
  getCustomersWithQualifiers: vi.fn(),
}));

import { selectEligibleOffers } from "./freeShippingOffers.server";
import { getManyShippingDiscountActionsNotCount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import { getCustomersWithQualifiers } from "app/models/app.server/customers/customer.server";

const getActions = vi.mocked(getManyShippingDiscountActionsNotCount);
const getCustomers = vi.mocked(getCustomersWithQualifiers);

const db = {} as never;

function action(overrides: Record<string, unknown> = {}) {
  return {
    appliesToAllCustomers: false,
    qualifierIds: [] as string[],
    minimumCartValue: 50,
    type: "percentage",
    value: 100,
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  getCustomers.mockResolvedValue([] as never);
});

describe("selectEligibleOffers", () => {
  it("returns only all-customer offers for guests and never looks up a customer", async () => {
    getActions.mockResolvedValue([
      action({ appliesToAllCustomers: true, minimumCartValue: 50 }),
      action({ qualifierIds: ["7"], minimumCartValue: 30 }),
    ] as never);

    const offers = await selectEligibleOffers(db, "shop.myshopify.com", null);

    expect(offers).toEqual([
      { threshold: 50, rewardType: "free_shipping", value: 100 },
    ]);
    expect(getCustomers).not.toHaveBeenCalled();
  });

  it("includes audience offers a logged-in customer qualifies for, sorted ascending", async () => {
    getActions.mockResolvedValue([
      action({ appliesToAllCustomers: true, minimumCartValue: 50 }),
      action({ qualifierIds: ["7"], minimumCartValue: 30 }),
      action({ qualifierIds: ["99"], minimumCartValue: 10 }), // not this shopper
    ] as never);
    getCustomers.mockResolvedValue([{ qualifiers: [{ id: 7 }] }] as never);

    const offers = await selectEligibleOffers(db, "shop.myshopify.com", "123");

    expect(offers.map((o) => o.threshold)).toEqual([30, 50]);
    // Numeric proxy id is normalized to GID + raw for matching.
    expect(getCustomers).toHaveBeenCalledWith(
      { shop: "shop.myshopify.com", shopifyIds: ["gid://shopify/Customer/123", "123"] },
      db,
    );
  });

  it("maps reward types from discount type/value", async () => {
    getActions.mockResolvedValue([
      action({ appliesToAllCustomers: true, type: "percentage", value: 100, minimumCartValue: 10 }),
      action({ appliesToAllCustomers: true, type: "percentage", value: 50, minimumCartValue: 20 }),
      action({ appliesToAllCustomers: true, type: "fixed", value: 5, minimumCartValue: 30 }),
    ] as never);

    const offers = await selectEligibleOffers(db, "shop.myshopify.com", null);

    expect(offers.map((o) => o.rewardType)).toEqual([
      "free_shipping",
      "percentage_off",
      "amount_off",
    ]);
  });

  it("skips offers with no minimum cart value", async () => {
    getActions.mockResolvedValue([
      action({ appliesToAllCustomers: true, minimumCartValue: null }),
      action({ appliesToAllCustomers: true, minimumCartValue: 40 }),
    ] as never);

    const offers = await selectEligibleOffers(db, "shop.myshopify.com", null);

    expect(offers.map((o) => o.threshold)).toEqual([40]);
  });
});

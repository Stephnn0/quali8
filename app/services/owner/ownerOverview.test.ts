import { describe, expect, it } from "vitest";
import {
  classifyStore,
  filterStores,
  isOwnerShop,
  isTestStore,
  summarizeStores,
  tokenStateOf,
  type OwnerStoreInput,
  type OwnerStoreRow,
} from "./ownerOverview";

const NOW = new Date("2026-10-11T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const baseStore = (over: Partial<OwnerStoreInput> = {}): OwnerStoreInput => ({
  shop: "one.myshopify.com",
  status: "SETUP",
  appVersion: "1.2.0",
  createdAt: new Date(NOW.getTime() - 40 * DAY),
  updatedAt: new Date(NOW.getTime() - 1 * DAY),
  shopData: {
    name: "Store One",
    email: "shop@one.com",
    shopOwnerName: "Pat Owner",
    country: "US",
    currency: "USD",
    planDisplayName: "Basic",
    primaryLocale: "en",
  },
  sessions: [],
  subscriptions: [],
  ...over,
});

const advanceSub = (over: Record<string, unknown> = {}) => ({
  name: "Advance",
  status: "ACTIVE" as const,
  test: false,
  trialDays: 5,
  startDate: new Date(NOW.getTime() - 2 * DAY),
  currentPeriodEnd: new Date(NOW.getTime() + 28 * DAY),
  updatedAt: new Date(NOW.getTime() - 2 * DAY),
  cancelMethod: null,
  recurringPlan: { name: "Advance", level: "ADVANCE" as const, price: 25 },
  shopifyRecurringPricing: { price: 25, discountPriceAfter: null, interval: "EVERY_30_DAYS" as const },
  ...over,
});

describe("isOwnerShop", () => {
  it("only matches the configured owner shops", () => {
    expect(isOwnerShop("electronics-shopicode.myshopify.com")).toBe(true);
    expect(isOwnerShop("Electronics-Shopicode.myshopify.com")).toBe(true);
    expect(isOwnerShop("someone-else.myshopify.com")).toBe(false);
    expect(isOwnerShop(undefined)).toBe(false);
  });
});

describe("isTestStore", () => {
  it("flags owner, whitelisted, app-review and development-plan stores", () => {
    expect(isTestStore("electronics-shopicode.myshopify.com", "Developer Preview")).toBe(true);
    expect(isTestStore("quali8-dev-gamma.myshopify.com", "Basic")).toBe(true);
    expect(isTestStore("app-review-99b19030-r100168-a0.myshopify.com", "Basic")).toBe(true);
    expect(isTestStore("demo-store-oneapp.myshopify.com", "Shopify Plus App Development")).toBe(true);
    expect(isTestStore("oroa-development.myshopify.com", "Developer Preview")).toBe(true);
  });

  it("keeps real merchants", () => {
    expect(isTestStore("flowers-of-palm-beach.myshopify.com", "Shopify Plus")).toBe(false);
    expect(isTestStore("e515dh-1m.myshopify.com", "Shopify")).toBe(false);
    expect(isTestStore("0yw1e7-e9.myshopify.com", "Basic")).toBe(false);
    expect(isTestStore("0yw1e7-e9.myshopify.com", null)).toBe(false);
  });
});

describe("classifyStore", () => {
  it("is Free with no subscription rows", () => {
    const row = classifyStore(baseStore(), NOW);
    expect(row.plan).toBe("Free");
    expect(row.state).toBe("free");
    expect(row.installed).toBe(true);
    expect(row.trialEndsAt).toBeNull();
    expect(row.monthlyPrice).toBe(0);
  });

  it("is in trial while the Advance trial is running", () => {
    const row = classifyStore(baseStore({ subscriptions: [advanceSub()] }), NOW);
    expect(row.plan).toBe("Advance");
    expect(row.state).toBe("trial");
    expect(row.trialEndsAt).toEqual(new Date(NOW.getTime() + 3 * DAY));
    expect(row.trialDaysLeft).toBe(3);
    expect(row.monthlyPrice).toBe(25);
  });

  it("is paying once the trial has ended", () => {
    const sub = advanceSub({ startDate: new Date(NOW.getTime() - 10 * DAY) });
    const row = classifyStore(baseStore({ subscriptions: [sub] }), NOW);
    expect(row.state).toBe("paid");
    expect(row.trialEndsAt).toEqual(new Date(NOW.getTime() - 5 * DAY));
    expect(row.trialDaysLeft).toBe(0);
  });

  it("uses the discounted price when there is one", () => {
    const sub = advanceSub({
      startDate: new Date(NOW.getTime() - 10 * DAY),
      shopifyRecurringPricing: { price: 25, discountPriceAfter: 10, interval: "EVERY_30_DAYS" },
    });
    expect(classifyStore(baseStore({ subscriptions: [sub] }), NOW).monthlyPrice).toBe(10);
  });

  it("flags test subscriptions and counts no revenue for them", () => {
    const sub = advanceSub({ test: true, startDate: new Date(NOW.getTime() - 10 * DAY) });
    const row = classifyStore(baseStore({ subscriptions: [sub] }), NOW);
    expect(row.test).toBe(true);
    expect(row.state).toBe("paid");
    expect(row.monthlyPrice).toBe(0);
  });

  it("is uninstalled when the store says so, and remembers how the plan ended", () => {
    const sub = advanceSub({
      status: "CANCELLED",
      cancelMethod: "UNINSTALL",
      currentPeriodEnd: null,
    });
    const row = classifyStore(
      baseStore({ status: "UNINSTALLED", subscriptions: [sub] }),
      NOW,
    );
    expect(row.installed).toBe(false);
    expect(row.state).toBe("uninstalled");
    expect(row.plan).toBe("Free");
    expect(row.lastSubscription).toEqual({
      name: "Advance",
      status: "CANCELLED",
      cancelMethod: "UNINSTALL",
    });
  });

  it("prefers the active subscription over a newer cancelled one", () => {
    const cancelled = advanceSub({
      status: "CANCELLED",
      cancelMethod: "MANUAL",
      updatedAt: NOW,
    });
    const free = advanceSub({
      name: "Free",
      trialDays: null,
      recurringPlan: { name: "Free", level: "FREE", price: 0 },
      shopifyRecurringPricing: null,
      updatedAt: new Date(NOW.getTime() - 5 * DAY),
    });
    const row = classifyStore(baseStore({ subscriptions: [cancelled, free] }), NOW);
    expect(row.plan).toBe("Free");
    expect(row.state).toBe("free");
    expect(row.lastSubscription?.status).toBe("ACTIVE");
  });

  it("labels the retired Pro tier as legacy", () => {
    const sub = advanceSub({
      name: "Pro",
      trialDays: null,
      recurringPlan: { name: "Pro", level: "BASIC", price: 10 },
      shopifyRecurringPricing: { price: 10, discountPriceAfter: null, interval: "EVERY_30_DAYS" },
    });
    expect(classifyStore(baseStore({ subscriptions: [sub] }), NOW).plan).toBe("Pro (legacy)");
  });

  it("takes the contact from the account owner session, then the shop data", () => {
    const withSession = classifyStore(
      baseStore({
        sessions: [
          { email: "staff@one.com", firstName: "Sam", lastName: "Staff", accountOwner: false },
          { email: "owner@one.com", firstName: "Olive", lastName: "Owner", accountOwner: true },
        ],
      }),
      NOW,
    );
    expect(withSession.contactEmail).toBe("owner@one.com");
    expect(withSession.contactName).toBe("Olive Owner");

    const fromShopData = classifyStore(baseStore(), NOW);
    expect(fromShopData.contactEmail).toBe("shop@one.com");
    expect(fromShopData.contactName).toBe("Pat Owner");
  });

  it("reports days since install", () => {
    expect(classifyStore(baseStore(), NOW).daysInstalled).toBe(40);
  });

  it("marks a development store as a test store but still classifies its plan", () => {
    const row = classifyStore(
      baseStore({
        shop: "demo-store-oneapp.myshopify.com",
        shopData: { ...baseStore().shopData!, planDisplayName: "Shopify Plus App Development" },
        subscriptions: [
          advanceSub({
            startDate: new Date(NOW.getTime() - 10 * DAY),
            shopifyRecurringPricing: { price: 0, discountPriceAfter: null, interval: "EVERY_30_DAYS" },
          }),
        ],
      }),
      NOW,
    );
    expect(row.testStore).toBe(true);
    expect(row.plan).toBe("Advance");
    expect(row.state).toBe("paid");
    expect(row.monthlyPrice).toBe(0);
  });
});

describe("tokenStateOf", () => {
  const offline = { email: null, firstName: null, lastName: null, accountOwner: false, isOnline: false };
  it("tells a live, refreshable, expired and missing offline token apart", () => {
    expect(tokenStateOf([], NOW)).toBe("none");
    expect(tokenStateOf([{ ...offline, isOnline: true }], NOW)).toBe("none");
    expect(tokenStateOf([{ ...offline, expires: null }], NOW)).toBe("valid");
    expect(tokenStateOf([{ ...offline, expires: new Date(NOW.getTime() + 1000) }], NOW)).toBe("valid");
    expect(
      tokenStateOf([{ ...offline, expires: new Date(NOW.getTime() - 1000), hasRefreshToken: true }], NOW),
    ).toBe("refreshable");
    expect(tokenStateOf([{ ...offline, expires: new Date(NOW.getTime() - 1000) }], NOW)).toBe("expired");
  });
});

describe("summarizeStores", () => {
  const rows: OwnerStoreRow[] = [
    classifyStore(baseStore({ shop: "a.myshopify.com" }), NOW),
    classifyStore(baseStore({ shop: "b.myshopify.com", subscriptions: [advanceSub()] }), NOW),
    classifyStore(
      baseStore({
        shop: "c.myshopify.com",
        subscriptions: [advanceSub({ startDate: new Date(NOW.getTime() - 10 * DAY) })],
      }),
      NOW,
    ),
    classifyStore(
      baseStore({
        shop: "d.myshopify.com",
        subscriptions: [advanceSub({ test: true, startDate: new Date(NOW.getTime() - 10 * DAY) })],
      }),
      NOW,
    ),
    classifyStore(baseStore({ shop: "e.myshopify.com", status: "UNINSTALLED" }), NOW),
    classifyStore(
      baseStore({
        shop: "electronics-shopicode.myshopify.com",
        subscriptions: [advanceSub({ startDate: new Date(NOW.getTime() - 10 * DAY) })],
      }),
      NOW,
    ),
  ];

  it("counts every bucket and keeps test stores out of the business numbers", () => {
    expect(summarizeStores(rows)).toEqual({
      total: 5,
      installed: 4,
      uninstalled: 1,
      free: 1,
      advance: 3,
      trial: 1,
      paying: 2,
      test: 1,
      testStores: 1,
      monthlyRevenue: 25,
    });
  });

  it("filters by bucket and by text", () => {
    expect(filterStores(rows, "all", "").map((r) => r.shop)).toHaveLength(6);
    expect(filterStores(rows, "advance", "").map((r) => r.shop)).toEqual([
      "b.myshopify.com",
      "c.myshopify.com",
      "d.myshopify.com",
    ]);
    expect(filterStores(rows, "trial", "").map((r) => r.shop)).toEqual(["b.myshopify.com"]);
    expect(filterStores(rows, "free", "").map((r) => r.shop)).toEqual(["a.myshopify.com"]);
    expect(filterStores(rows, "uninstalled", "").map((r) => r.shop)).toEqual(["e.myshopify.com"]);
    expect(filterStores(rows, "test", "").map((r) => r.shop)).toEqual([
      "d.myshopify.com",
      "electronics-shopicode.myshopify.com",
    ]);
    expect(filterStores(rows, "all", "  D.MYSHOPIFY ").map((r) => r.shop)).toEqual(["d.myshopify.com"]);
    expect(filterStores(rows, "all", "shop@one").map((r) => r.shop)).toHaveLength(6);
  });
});

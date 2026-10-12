import type { PrismaClient } from "@prisma/client";
import {
  classifyStore,
  summarizeStores,
  type OwnerStoreRow,
  type OwnerSummary,
} from "./ownerOverview";

export type OwnerOverview = {
  rows: OwnerStoreRow[];
  summary: OwnerSummary;
  generatedAt: Date;
};

/**
 * Every store that ever installed the app, with its subscriptions, shop
 * data and the account-owner session, classified for the owner overview.
 * Sorted so the newest installs come first.
 */
export async function loadOwnerOverview(
  db: PrismaClient,
  now = new Date(),
): Promise<OwnerOverview> {
  const [stores, sessions] = await Promise.all([
    db.shopifyStore.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        shop: true,
        status: true,
        appVersion: true,
        createdAt: true,
        updatedAt: true,
        shopData: {
          select: {
            name: true,
            email: true,
            shopOwnerName: true,
            country: true,
            currency: true,
            planDisplayName: true,
            primaryLocale: true,
          },
        },
        shopifySubscriptions: {
          select: {
            name: true,
            status: true,
            test: true,
            trialDays: true,
            startDate: true,
            currentPeriodEnd: true,
            updatedAt: true,
            cancelMethod: true,
            recurringPlan: { select: { name: true, level: true, price: true } },
            shopifyRecurringPricing: {
              select: { price: true, discountPriceAfter: true, interval: true },
            },
          },
        },
      },
    }),
    // Sessions are deleted on uninstall, so this only covers live installs;
    // the classifier falls back to the shop data for the rest.
    db.session.findMany({
      select: {
        shop: true,
        email: true,
        firstName: true,
        lastName: true,
        accountOwner: true,
      },
    }),
  ]);

  const sessionsByShop = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const list = sessionsByShop.get(session.shop) ?? [];
    list.push(session);
    sessionsByShop.set(session.shop, list);
  }

  const rows = stores.map((store) =>
    classifyStore(
      {
        shop: store.shop,
        status: store.status,
        appVersion: store.appVersion,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        shopData: store.shopData,
        sessions: sessionsByShop.get(store.shop) ?? [],
        subscriptions: store.shopifySubscriptions,
      },
      now,
    ),
  );

  return { rows, summary: summarizeStores(rows), generatedAt: now };
}

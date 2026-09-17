/* eslint-disable no-console */
import { type Prisma, type PrismaClient } from '@prisma/client';
import { APP_PLANS } from 'app/constants/plans';

export async function seedPlans(db: PrismaClient) {
  // shopifyPlanHandle is app-side only — RecurringPlan has no such column
  const { shopifyPlanHandle: _freeHandle, ...FREE } = APP_PLANS.FREE;
  const { shopifyPlanHandle: _advanceHandle, ...ADVANCE } = APP_PLANS.ADVANCE;

  // Only Free and Advance are seeded. The retired Pro rows (`pro-monthly`,
  // `pro-annual`) are left untouched so existing subscriptions keep their
  // foreign keys; nothing new can subscribe to them.
  const PLANS: Prisma.RecurringPlanCreateInput[] = [
    {
        ...FREE,
        code: 'free-monthly',
        interval: "EVERY_30_DAYS",
        read_generalApis: false,
        write_generalApis: false
    },
    {
        ...FREE,
        code: 'free-annual',
        interval: "ANNUAL",
        read_generalApis: false,
        write_generalApis: false
    },
    {
        ...ADVANCE,
        price: 25.00,
        code: 'advance-monthly',
        interval: "EVERY_30_DAYS",
        read_generalApis: false,
        write_generalApis: false
    },
  ];

  await Promise.all(
    PLANS.map((plan) =>
      db.recurringPlan.upsert({
        update: plan,
        create: plan,
        where: { code: plan.code },
      })
    )
  );

  // Legacy Pro rows are not re-seeded, but a paid legacy tier must include
  // everything the Free plan now does (announcements, zones, popup, unlimited).
  await db.recurringPlan.updateMany({
    where: { code: { in: ['pro-monthly', 'pro-annual'] } },
    data: {
      hasAnnouncements: true,
      hasDeliveryZones: true,
      hasSubscribePopup: true,
      bundleLimit: null,
      popupSignupLimit: null,
    },
  });
}
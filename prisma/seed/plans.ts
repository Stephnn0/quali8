/* eslint-disable no-console */
import { type Prisma, type PrismaClient } from '@prisma/client';
import { APP_PLANS } from 'app/constants/plans';

export async function seedPlans(db: PrismaClient) {
  // shopifyPlanHandle is app-side only — RecurringPlan has no such column
  const { shopifyPlanHandle: _freeHandle, ...FREE } = APP_PLANS.FREE;
  const { shopifyPlanHandle: _basicHandle, ...BASIC } = APP_PLANS.BASIC;
  const { shopifyPlanHandle: _advanceHandle, ...ADVANCE } = APP_PLANS.ADVANCE;

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
        ...BASIC,
        price: 10.00,
        code: 'pro-monthly',
        interval: "EVERY_30_DAYS",
        read_generalApis: false,
        write_generalApis: false
    },
    {
        ...BASIC,
        price: 108,
        code: 'pro-annual',
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
}
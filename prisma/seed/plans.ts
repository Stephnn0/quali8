/* eslint-disable no-console */
import { type Prisma, type PrismaClient } from '@prisma/client';
import { APP_PLANS } from 'app/constants/plans';

export async function seedPlans(db: PrismaClient) {
  const PLANS: Prisma.RecurringPlanCreateInput[] = [
    {
        ...APP_PLANS.FREE,
        code: 'free-monthly',
        interval: "EVERY_30_DAYS",
        read_generalApis: false,
        write_generalApis: false
    },
    {
        ...APP_PLANS.FREE,
        code: 'free-annual',
        interval: "ANNUAL",
        read_generalApis: false,
        write_generalApis: false
    },
    {
        ...APP_PLANS.BASIC,
        price: 10.00,
        code: 'pro-monthly',
        interval: "EVERY_30_DAYS",
        read_generalApis: false,
        write_generalApis: false
    },
    {
        ...APP_PLANS.BASIC,
        price: 108,
        code: 'pro-annual',
        interval: "ANNUAL",
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
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { seedPlans } from './plans';

// * npx prisma db seed

const db = new PrismaClient();

async function seed() {
  await seedPlans(db);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export async function createCustomer(
  prismaArgs: Prisma.CustomersCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const customer = await db.customers.create(prismaArgs);
    return customer;
  } catch (error) {
    console.error("Error creating customer:", error);
  }
}

export async function createManyCustomers(
  prismaArgs: Prisma.CustomersCreateManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const customers = await db.customers.createMany(prismaArgs);
    return customers;
  } catch (error) {
    console.error("Error creating many customer:", error);
  }
}

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

export async function upsertCustomer(
  db: PrismaClient,
  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
    shop: string;
    qualifierId: number;
  },
) {
  try {
    const result = await db.customers.upsert({
      where: { email: customer.email },
      update: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        shopifyStore: { connect: { shop: customer.shop } },
        qualifiers: { connect: { id: customer.qualifierId } },
      },
      create: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        shopifyStore: { connect: { shop: customer.shop } },
        qualifiers: { connect: { id: customer.qualifierId } },
      },
    });

    return result;
  } catch (error) {
    console.error("Error upserting customer:", error);
  }
}

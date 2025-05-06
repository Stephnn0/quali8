import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export async function getManyCustomers(
  prismaArgs: Prisma.CustomersFindManyArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const customers = await db.customers.findMany(prismaArgs);
    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}

export async function getCustomersByIds(
  shopifyIds: string[],
  db: PrismaClient,
) {
  try {
    const customers = await db.customers.findMany({
      where: {
        shopifyId: {
          in: shopifyIds,
        },
      },
    });
    return customers;
  } catch (error) {
    console.error("Error fetching customers by IDs:", error);
    throw error;
  }
}

export async function createCustomer(
  prismaArgs: Prisma.CustomersCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const customer = await db.customers.create(prismaArgs);
    return customer;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
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
    throw error;
  }
}

export async function upsertCustomer(
  db: PrismaClient,
  customer: {
    shopifyId: string;
    firstName?: string;
    lastName?: string;
    shop: string;
    qualifierId: number;
    amountSpent?: number;
    orderCount?: number;
    country?: string;
  },
) {
  try {
    const result = await db.customers.upsert({
      where: { shopifyId: customer.shopifyId },
      update: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        shopifyStore: { connect: { shop: customer.shop } },
        qualifiers: { connect: { id: customer.qualifierId } },
        amountSpent:
          customer.amountSpent !== undefined
            ? customer.amountSpent.toString()
            : "0",
        orderCount: customer.orderCount,
        country: customer.country,
      },
      create: {
        shopifyId: customer.shopifyId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        shopifyStore: { connect: { shop: customer.shop } },
        qualifiers: { connect: { id: customer.qualifierId } },
        amountSpent:
          customer.amountSpent !== undefined
            ? customer.amountSpent.toString()
            : "0",
        orderCount: customer.orderCount,
        country: customer.country,
      },
    });

    return result;
  } catch (error) {
    console.error("Error upserting customer:", error);
    throw error;
  }
}

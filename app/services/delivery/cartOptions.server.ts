import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { MAX_NOTES_LABEL, defaultCartOptions, sanitizeCartOptions, type CartOptions } from "./cartOptions";

/** The "Options step" card saves everything at once. */
export const cartOptionsActionSchema = z.object({
  action: z.literal("save-cart-options"),
  enabled: z.boolean(),
  occasionEnabled: z.boolean(),
  cardMessageEnabled: z.boolean(),
  notesEnabled: z.boolean(),
  notesLabel: z.string().max(MAX_NOTES_LABEL),
  doorEnabled: z.boolean(),
});

export type CartOptionsActionBody = z.infer<typeof cartOptionsActionSchema>;

export async function loadCartOptions(db: PrismaClient, shop: string): Promise<CartOptions> {
  const row = await db.cartOptionsSettings.findUnique({ where: { shop } });
  return row ? sanitizeCartOptions(row) : defaultCartOptions();
}

export async function saveCartOptions(
  db: PrismaClient,
  shop: string,
  body: CartOptionsActionBody,
): Promise<{ code: string; errors: Array<{ message: string }> | null }> {
  const data = sanitizeCartOptions(body);
  await db.cartOptionsSettings.upsert({
    where: { shop },
    create: { ...data, shop },
    update: data,
  });
  return { code: "cart-options-saved", errors: null };
}

import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
  type CartLinesInput,
  type CartLinesDiscountsGenerateRunResult,
  type ProductDiscountCandidate,
} from "../generated/api";
import type { BundleDiscountConfig, BundleDiscountConfigBundle } from "./types";

const EMPTY: CartLinesDiscountsGenerateRunResult = { operations: [] };

type CartLine = CartLinesInput["cart"]["lines"][number];

/**
 * Applies each bundle's percentage to the cart lines that were added by the
 * storefront bundle block (tagged with the `_quali8_bundle` line property) —
 * but only while the complete bundle is in the cart. The bundle definitions
 * come from the discount metafield written by
 * `app/services/bundles/bundleDiscountSync.server.ts`.
 */
export function cartLinesDiscountsGenerateRun(
  input: CartLinesInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.discount.discountClasses.includes(DiscountClass.Product)) {
    return EMPTY;
  }

  const config = parseConfig(input.discount.metafield?.jsonValue);
  if (!config || config.bundles.length === 0) return EMPTY;

  const bundlesById = new Map<string, BundleDiscountConfigBundle>();
  for (const bundle of config.bundles) {
    bundlesById.set(String(bundle.id), bundle);
  }

  // Group cart lines by the bundle they claim to belong to.
  const lineGroups = new Map<string, CartLine[]>();
  for (const cartLine of input.cart.lines) {
    const bundleId = cartLine.bundleAttribute?.value;
    if (!bundleId) continue;
    const group = lineGroups.get(bundleId);
    if (group) {
      group.push(cartLine);
    } else {
      lineGroups.set(bundleId, [cartLine]);
    }
  }

  const candidates: ProductDiscountCandidate[] = [];
  for (const [bundleId, group] of lineGroups) {
    const bundle = bundlesById.get(bundleId);
    if (!bundle) continue;

    const percent = clampPercent(bundle.discountPercent);
    if (percent <= 0) continue;

    // The line property is buyer-editable, so only trust lines whose variant
    // is genuinely part of the bundle.
    const bundleVariantIds = new Set(bundle.items.map((item) => item.variantId));
    const matchingLines: CartLine[] = [];
    const quantityByVariant = new Map<string, number>();
    for (const cartLine of group) {
      if (cartLine.merchandise.__typename !== "ProductVariant") continue;
      const variantId = cartLine.merchandise.id;
      if (!bundleVariantIds.has(variantId)) continue;
      matchingLines.push(cartLine);
      quantityByVariant.set(
        variantId,
        (quantityByVariant.get(variantId) ?? 0) + cartLine.quantity,
      );
    }

    // Every configured item must be present at its required quantity —
    // removing part of the bundle in the cart revokes the discount.
    const isComplete = bundle.items.every(
      (item) => (quantityByVariant.get(item.variantId) ?? 0) >= item.quantity,
    );
    if (!isComplete) continue;

    candidates.push({
      message: bundle.title || `${percent}% bundle discount`,
      targets: matchingLines.map((cartLine) => ({
        cartLine: { id: cartLine.id },
      })),
      value: { percentage: { value: percent } },
    });
  }

  if (candidates.length === 0) return EMPTY;

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: ProductDiscountSelectionStrategy.All,
          candidates,
        },
      },
    ],
  };
}

function clampPercent(percent: number): number {
  if (typeof percent !== "number" || !Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100);
}

/** Defensive parse — a malformed metafield must never break checkout. */
function parseConfig(jsonValue: unknown): BundleDiscountConfig | null {
  if (jsonValue == null || typeof jsonValue !== "object") return null;
  const bundles = (jsonValue as { bundles?: unknown }).bundles;
  if (!Array.isArray(bundles)) return null;

  const parsed: BundleDiscountConfigBundle[] = [];
  for (const bundle of bundles) {
    if (bundle == null || typeof bundle !== "object") continue;
    const { id, title, discountPercent, items } = bundle as Record<
      string,
      unknown
    >;
    if (typeof id !== "number" || typeof discountPercent !== "number") continue;
    if (!Array.isArray(items) || items.length === 0) continue;

    const parsedItems = [];
    for (const item of items) {
      if (item == null || typeof item !== "object") continue;
      const { variantId, quantity } = item as Record<string, unknown>;
      if (typeof variantId !== "string" || variantId === "") continue;
      parsedItems.push({
        variantId,
        quantity:
          typeof quantity === "number" && quantity > 0 ? quantity : 1,
      });
    }
    if (parsedItems.length !== items.length) continue;

    parsed.push({
      id,
      title: typeof title === "string" ? title : "",
      discountPercent,
      items: parsedItems,
    });
  }

  return { bundles: parsed };
}

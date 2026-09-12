import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type {
  AnnouncementBarConfig,
  HeroConfig,
  PopupConfig,
  SeoAppliedAction,
  SpecialDateActionResult,
} from "app/components/Seasonal/types";
import {
  removeAnnouncementSchema,
  removeHeroSchema,
  removePopupSchema,
  saveAnnouncementSchema,
  saveHeroSchema,
  savePopupSchema,
  toAnnouncementConfig,
  toHeroConfig,
  toPopupConfig,
  toSeoAppliedAction,
} from "./specialDateDetail.server";

/**
 * The shop-wide seasonal configs: one announcement bar, one hero, and one
 * subscribe popup per shop, stored as rows with no special date
 * (`specialDateId: null`). These are what the standalone feature pages
 * edit. Rows scheduled from a Sales Calendar date keep their date and are
 * untouched here; the storefront proxies show whichever row's window
 * covers today.
 */
export type ShopFeatureConfig = {
  announcementBar: AnnouncementBarConfig | null;
  hero: HeroConfig | null;
  popup: PopupConfig | null;
  /** Latest SEO changes applied anywhere in this shop, newest first. */
  seoActions: SeoAppliedAction[];
};

const shopWide = (shop: string) => ({ shop, specialDateId: null });

export async function loadShopFeatureConfig(
  db: PrismaClient,
  shop: string,
): Promise<ShopFeatureConfig> {
  const [announcementBar, hero, popup, seoActions] = await Promise.all([
    db.announcementBar.findFirst({ where: shopWide(shop) }),
    db.scheduledHero.findFirst({ where: shopWide(shop) }),
    db.subscribePopup.findFirst({ where: shopWide(shop) }),
    db.seoMetaAction.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    announcementBar: announcementBar ? toAnnouncementConfig(announcementBar) : null,
    hero: hero ? toHeroConfig(hero) : null,
    popup: popup ? toPopupConfig(popup) : null,
    seoActions: seoActions.map(toSeoAppliedAction),
  };
}

export const shopFeatureActionSchema = z.discriminatedUnion("action", [
  saveAnnouncementSchema,
  removeAnnouncementSchema,
  saveHeroSchema,
  removeHeroSchema,
  savePopupSchema,
  removePopupSchema,
]);

export type ShopFeatureActionBody = z.infer<typeof shopFeatureActionSchema>;

/** Saves or removes one shop-wide config. Same result shape as the date actions. */
export async function runShopFeatureAction(input: {
  db: PrismaClient;
  shop: string;
  body: ShopFeatureActionBody;
}): Promise<SpecialDateActionResult> {
  const { db, shop, body } = input;

  if (
    "startDate" in body &&
    "endDate" in body &&
    body.startDate > body.endDate
  ) {
    return {
      code: "error",
      errors: [{ message: "The start date must be before the end date" }],
    };
  }

  switch (body.action) {
    case "save-announcement": {
      const data = {
        enabled: body.enabled,
        message: body.message,
        backgroundColor: body.backgroundColor,
        textColor: body.textColor,
        startDate: body.startDate,
        endDate: body.endDate,
      };
      const existing = await db.announcementBar.findFirst({
        where: shopWide(shop),
        select: { id: true },
      });
      if (existing) {
        await db.announcementBar.update({ where: { id: existing.id }, data });
      } else {
        await db.announcementBar.create({ data: { ...shopWide(shop), ...data } });
      }
      return { code: "announcement-saved", errors: null };
    }

    case "remove-announcement":
      await db.announcementBar.deleteMany({ where: shopWide(shop) });
      return { code: "announcement-removed", errors: null };

    case "save-hero": {
      const data = {
        enabled: body.enabled,
        imageUrl: body.imageUrl,
        imageUrl2: body.imageUrl2 ?? null,
        imageUrl3: body.imageUrl3 ?? null,
        heading: body.heading,
        description: body.description ?? null,
        buttonLabel: body.buttonLabel ?? null,
        buttonUrl: body.buttonUrl ?? null,
        heightPx: body.heightPx,
        textColor: body.textColor,
        buttonBackground: body.buttonBackground,
        buttonTextColor: body.buttonTextColor,
        overlayOpacity: body.overlayOpacity,
        startDate: body.startDate,
        endDate: body.endDate,
      };
      const existing = await db.scheduledHero.findFirst({
        where: shopWide(shop),
        select: { id: true },
      });
      if (existing) {
        await db.scheduledHero.update({ where: { id: existing.id }, data });
      } else {
        await db.scheduledHero.create({ data: { ...shopWide(shop), ...data } });
      }
      return { code: "hero-saved", errors: null };
    }

    case "remove-hero":
      await db.scheduledHero.deleteMany({ where: shopWide(shop) });
      return { code: "hero-removed", errors: null };

    case "save-popup": {
      const data = {
        enabled: body.enabled,
        imageUrl: body.imageUrl,
        heading: body.heading,
        description: body.description,
        discountCode: body.discountCode,
        startDate: body.startDate,
        endDate: body.endDate,
      };
      const existing = await db.subscribePopup.findFirst({
        where: shopWide(shop),
        select: { id: true },
      });
      if (existing) {
        await db.subscribePopup.update({ where: { id: existing.id }, data });
      } else {
        await db.subscribePopup.create({ data: { ...shopWide(shop), ...data } });
      }
      return { code: "popup-saved", errors: null };
    }

    case "remove-popup":
      await db.subscribePopup.deleteMany({ where: shopWide(shop) });
      return { code: "popup-removed", errors: null };
  }
}

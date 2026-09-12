import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { generateDateTodos } from "app/services/assistant/dateTodos.server";
import type {
  SpecialDateActionResult,
  SpecialDateDetail,
} from "app/components/Seasonal/types";

/**
 * Everything attached to one special date: its to-dos, applied SEO changes,
 * and the four scheduled theme configs. Shared by the Sales Calendar manage
 * page and every standalone seasonal feature page, so the per-date data and
 * mutations have a single home.
 *
 * Generates the AI to-do starter set lazily on first load (once per date —
 * `todosGeneratedAt` guards against regenerating after the merchant deletes
 * suggestions).
 */
export async function loadSpecialDateDetail(
  db: PrismaClient,
  shop: string,
  specialDateId: number,
): Promise<SpecialDateDetail | null> {
  if (!Number.isInteger(specialDateId)) return null;

  const specialDate = await db.specialDate.findFirst({
    where: { id: specialDateId, shop },
  });
  if (!specialDate) return null;

  if (!specialDate.todosGeneratedAt) {
    const profile = await db.storeProfile.findUnique({ where: { shop } });
    await generateDateTodos(
      db,
      shop,
      {
        id: specialDate.id,
        name: specialDate.name,
        date: specialDate.date,
        whyItMatters: specialDate.whyItMatters,
      },
      {
        nicheLabel: profile?.nicheLabel ?? "Shopify",
        country: profile?.country ?? null,
      },
    );
  }

  const [todos, seoActions, announcementBar, hero, popup, menuItem] =
    await Promise.all([
      db.specialDateTodo.findMany({
        where: { specialDateId: specialDate.id },
        orderBy: [{ kind: "asc" }, { position: "asc" }, { id: "asc" }],
      }),
      db.seoMetaAction.findMany({
        where: { specialDateId: specialDate.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.announcementBar.findUnique({
        where: { specialDateId: specialDate.id },
      }),
      db.scheduledHero.findUnique({
        where: { specialDateId: specialDate.id },
      }),
      db.subscribePopup.findUnique({
        where: { specialDateId: specialDate.id },
      }),
      db.scheduledMenuItem.findUnique({
        where: { specialDateId: specialDate.id },
      }),
    ]);

  return {
    specialDate: {
      id: specialDate.id,
      name: specialDate.name,
      date: specialDate.date,
      whyItMatters: specialDate.whyItMatters,
      source: specialDate.source,
    },
    todos: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      kind: todo.kind,
      source: todo.source,
      done: todo.done,
    })),
    seoActions: seoActions.map((entry) => ({
      id: entry.id,
      resourceType: entry.resourceType,
      resourceTitle: entry.resourceTitle,
      newSeoTitle: entry.newSeoTitle,
      createdAt: entry.createdAt.toISOString(),
    })),
    announcementBar: announcementBar
      ? {
          enabled: announcementBar.enabled,
          message: announcementBar.message,
          backgroundColor: announcementBar.backgroundColor,
          textColor: announcementBar.textColor,
          startDate: announcementBar.startDate,
          endDate: announcementBar.endDate,
        }
      : null,
    hero: hero
      ? {
          enabled: hero.enabled,
          imageUrl: hero.imageUrl,
          imageUrl2: hero.imageUrl2,
          imageUrl3: hero.imageUrl3,
          heading: hero.heading,
          description: hero.description,
          buttonLabel: hero.buttonLabel,
          buttonUrl: hero.buttonUrl,
          heightPx: hero.heightPx,
          textColor: hero.textColor,
          buttonBackground: hero.buttonBackground,
          buttonTextColor: hero.buttonTextColor,
          overlayOpacity: hero.overlayOpacity,
          startDate: hero.startDate,
          endDate: hero.endDate,
        }
      : null,
    popup: popup
      ? {
          enabled: popup.enabled,
          imageUrl: popup.imageUrl,
          heading: popup.heading,
          description: popup.description,
          discountCode: popup.discountCode,
          startDate: popup.startDate,
          endDate: popup.endDate,
        }
      : null,
    menuItem: menuItem
      ? {
          enabled: menuItem.enabled,
          menuId: menuItem.menuId,
          menuTitle: menuItem.menuTitle,
          itemTitle: menuItem.itemTitle,
          linkType: menuItem.linkType,
          resourceId: menuItem.resourceId,
          resourceTitle: menuItem.resourceTitle,
          url: menuItem.url,
          startDate: menuItem.startDate,
          endDate: menuItem.endDate,
          live: Boolean(menuItem.appliedMenuItemId),
          lastError: menuItem.lastError,
        }
      : null,
  };
}

// --- Mutations -------------------------------------------------------------

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const httpsUrl = z.string().url().startsWith("https://");

const addTodoSchema = z.object({
  action: z.literal("add-todo"),
  title: z.string().trim().min(1).max(80),
  kind: z.enum(["SEO", "MARKETING", "GENERAL"]),
});
const toggleTodoSchema = z.object({
  action: z.literal("toggle-todo"),
  id: z.number().int().positive(),
  done: z.boolean(),
});
const deleteTodoSchema = z.object({
  action: z.literal("delete-todo"),
  id: z.number().int().positive(),
});

const saveAnnouncementSchema = z.object({
  action: z.literal("save-announcement"),
  enabled: z.boolean(),
  message: z.string().trim().min(1).max(160),
  backgroundColor: hexColor,
  textColor: hexColor,
  startDate: isoDay,
  endDate: isoDay,
});
const removeAnnouncementSchema = z.object({
  action: z.literal("remove-announcement"),
});

const saveHeroSchema = z.object({
  action: z.literal("save-hero"),
  enabled: z.boolean(),
  imageUrl: httpsUrl,
  imageUrl2: httpsUrl.optional(),
  imageUrl3: httpsUrl.optional(),
  heading: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  buttonLabel: z.string().trim().max(40).optional(),
  buttonUrl: z.string().trim().max(400).optional(),
  heightPx: z.number().int().min(200).max(900),
  textColor: hexColor,
  buttonBackground: hexColor,
  buttonTextColor: hexColor,
  overlayOpacity: z.number().int().min(0).max(80),
  startDate: isoDay,
  endDate: isoDay,
});
const removeHeroSchema = z.object({ action: z.literal("remove-hero") });

const savePopupSchema = z.object({
  action: z.literal("save-popup"),
  enabled: z.boolean(),
  imageUrl: httpsUrl,
  heading: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(220),
  discountCode: z.string().trim().min(1).max(40),
  startDate: isoDay,
  endDate: isoDay,
});
const removePopupSchema = z.object({ action: z.literal("remove-popup") });

const saveMenuItemSchema = z.object({
  action: z.literal("save-menu-item"),
  enabled: z.boolean(),
  menuId: z.string().startsWith("gid://shopify/Menu/"),
  menuTitle: z.string().trim().min(1).max(80),
  itemTitle: z.string().trim().min(1).max(40),
  linkType: z.enum(["COLLECTION", "URL"]),
  resourceId: z.string().startsWith("gid://shopify/Collection/").optional(),
  resourceTitle: z.string().trim().max(120).optional(),
  url: z.string().trim().max(400).optional(),
  startDate: isoDay,
  endDate: isoDay,
});
const removeMenuItemSchema = z.object({
  action: z.literal("remove-menu-item"),
});

export const specialDateActionSchema = z.discriminatedUnion("action", [
  addTodoSchema,
  toggleTodoSchema,
  deleteTodoSchema,
  saveAnnouncementSchema,
  removeAnnouncementSchema,
  saveHeroSchema,
  removeHeroSchema,
  savePopupSchema,
  removePopupSchema,
  saveMenuItemSchema,
  removeMenuItemSchema,
]);

export type SpecialDateActionBody = z.infer<typeof specialDateActionSchema>;

/**
 * Applies one special-date mutation. The caller has already authenticated,
 * gatekept, and parsed the body; this checks the date belongs to the shop
 * and returns the `{ code, errors }` result the schedulers expect.
 */
export async function runSpecialDateAction(input: {
  db: PrismaClient;
  graphql: AdminGraphqlClient;
  shop: string;
  specialDateId: number;
  body: SpecialDateActionBody;
}): Promise<SpecialDateActionResult> {
  const { db, graphql, shop, body } = input;

  const specialDate = Number.isInteger(input.specialDateId)
    ? await db.specialDate.findFirst({
        where: { id: input.specialDateId, shop },
        select: { id: true },
      })
    : null;
  if (!specialDate) return { code: "not-found", errors: null };

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
    case "add-todo":
      await db.specialDateTodo.create({
        data: {
          shop,
          specialDateId: specialDate.id,
          title: body.title,
          kind: body.kind,
          source: "MERCHANT",
          position: 999,
        },
      });
      return { code: "todo-added", errors: null };

    case "toggle-todo":
      await db.specialDateTodo.updateMany({
        where: { id: body.id, specialDateId: specialDate.id },
        data: { done: body.done },
      });
      return { code: "todo-updated", errors: null };

    case "delete-todo":
      await db.specialDateTodo.deleteMany({
        where: { id: body.id, specialDateId: specialDate.id },
      });
      return { code: "todo-deleted", errors: null };

    case "save-announcement": {
      const data = {
        enabled: body.enabled,
        message: body.message,
        backgroundColor: body.backgroundColor,
        textColor: body.textColor,
        startDate: body.startDate,
        endDate: body.endDate,
      };
      await db.announcementBar.upsert({
        where: { specialDateId: specialDate.id },
        create: { shop, specialDateId: specialDate.id, ...data },
        update: data,
      });
      return { code: "announcement-saved", errors: null };
    }

    case "remove-announcement":
      await db.announcementBar.deleteMany({
        where: { specialDateId: specialDate.id },
      });
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
      await db.scheduledHero.upsert({
        where: { specialDateId: specialDate.id },
        create: { shop, specialDateId: specialDate.id, ...data },
        update: data,
      });
      return { code: "hero-saved", errors: null };
    }

    case "remove-hero":
      await db.scheduledHero.deleteMany({
        where: { specialDateId: specialDate.id },
      });
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
      await db.subscribePopup.upsert({
        where: { specialDateId: specialDate.id },
        create: { shop, specialDateId: specialDate.id, ...data },
        update: data,
      });
      return { code: "popup-saved", errors: null };
    }

    case "remove-popup":
      await db.subscribePopup.deleteMany({
        where: { specialDateId: specialDate.id },
      });
      return { code: "popup-removed", errors: null };

    case "save-menu-item": {
      if (body.linkType === "COLLECTION" && !body.resourceId) {
        return {
          code: "error",
          errors: [{ message: "Choose a collection for the menu item" }],
        };
      }
      if (body.linkType === "URL" && !body.url) {
        return {
          code: "error",
          errors: [{ message: "Add a URL for the menu item" }],
        };
      }
      const data = {
        enabled: body.enabled,
        menuId: body.menuId,
        menuTitle: body.menuTitle,
        itemTitle: body.itemTitle,
        linkType: body.linkType,
        resourceId: body.resourceId ?? null,
        resourceTitle: body.resourceTitle ?? null,
        url: body.url ?? null,
        startDate: body.startDate,
        endDate: body.endDate,
      };
      await db.scheduledMenuItem.upsert({
        where: { specialDateId: specialDate.id },
        create: { shop, specialDateId: specialDate.id, ...data },
        update: data,
      });
      return { code: "menu-item-saved", errors: null };
    }

    case "remove-menu-item": {
      const item = await db.scheduledMenuItem.findUnique({
        where: { specialDateId: specialDate.id },
      });
      if (!item) return { code: "menu-item-removed", errors: null };

      if (item.appliedMenuItemId) {
        // Best effort: pull our item out of the menu right now; on any
        // failure fall back to pausing so the sync job cleans it up.
        const cleaned = await removeLiveMenuItem(
          graphql,
          item.menuId,
          item.appliedMenuItemId,
        );
        if (!cleaned) {
          await db.scheduledMenuItem.update({
            where: { id: item.id },
            data: { enabled: false },
          });
          return {
            code: "menu-item-queued",
            errors: [
              {
                message:
                  "The link is still live — it will be removed from the menu by the next sync (within ~15 minutes)",
              },
            ],
          };
        }
      }
      await db.scheduledMenuItem.delete({ where: { id: item.id } });
      return { code: "menu-item-removed", errors: null };
    }
  }
}

/** Best-effort inline removal of our live menu item; false on any failure. */
async function removeLiveMenuItem(
  graphql: AdminGraphqlClient,
  menuId: string,
  menuItemId: string,
): Promise<boolean> {
  try {
    const read = await graphql(
      `#graphql
      query manageMenu($id: ID!) {
        menu(id: $id) {
          id
          title
          items {
            id title type url resourceId tags
            items { id title type url resourceId tags
              items { id title type url resourceId tags } }
          }
        }
      }`,
      { variables: { id: menuId } },
    );
    const { data } = await read.json();
    const menu = data?.menu;
    if (!menu) return true; // menu gone — nothing to clean

    type Node = {
      id: string; title: string; type: string;
      url?: string | null; resourceId?: string | null;
      tags?: string[] | null; items?: Node[] | null;
    };
    const toInput = (node: Node): Record<string, unknown> => ({
      id: node.id,
      title: node.title,
      type: node.type,
      url: node.url ?? undefined,
      resourceId: node.resourceId ?? undefined,
      tags: node.tags ?? [],
      items: (node.items ?? []).map(toInput),
    });
    const items = (menu.items as Node[])
      .filter((node) => node.id !== menuItemId)
      .map(toInput);
    if (items.length === (menu.items as Node[]).length) return true; // already gone

    const write = await graphql(
      `#graphql
      mutation manageMenuUpdate($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, items: $items) {
          menu { id }
          userErrors { message }
        }
      }`,
      { variables: { id: menu.id, title: menu.title, items } },
    );
    const result = await write.json();
    return (result.data?.menuUpdate?.userErrors ?? []).length === 0;
  } catch (error) {
    console.error("Inline menu item removal failed:", error);
    return false;
  }
}

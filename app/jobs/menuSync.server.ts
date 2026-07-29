import type { PrismaClient } from "@prisma/client";
import { createAdminApiClient } from "@shopify/admin-api-client";
import { todayInTimeZone, type Job } from "./runner.server";

const API_VERSION = "2026-04";

const GRAPHQL_QUERY_MENU = `#graphql
  query jobMenu($id: ID!) {
    menu(id: $id) {
      id
      handle
      title
      items {
        id
        title
        type
        url
        resourceId
        tags
        items {
          id
          title
          type
          url
          resourceId
          tags
          items {
            id
            title
            type
            url
            resourceId
            tags
          }
        }
      }
    }
  }
`;

const GRAPHQL_MUTATION_MENU_UPDATE = `#graphql
  mutation jobMenuUpdate($id: ID!, $title: String!, $handle: String, $items: [MenuItemUpdateInput!]!) {
    menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
      menu {
        id
        items {
          id
          title
        }
      }
      userErrors {
        message
      }
    }
  }
`;

type MenuItemNode = {
  id: string;
  title: string;
  type: string;
  url?: string | null;
  resourceId?: string | null;
  tags?: string[] | null;
  items?: MenuItemNode[] | null;
};

type MenuNode = {
  id: string;
  handle: string;
  title: string;
  items: MenuItemNode[];
};

/** Existing item → MenuItemUpdateInput, preserving ids and nesting. */
function toUpdateInput(item: MenuItemNode): Record<string, unknown> {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    url: item.url ?? undefined,
    resourceId: item.resourceId ?? undefined,
    tags: item.tags ?? [],
    items: (item.items ?? []).map(toUpdateInput),
  };
}

async function readMenu(
  client: ReturnType<typeof createAdminApiClient>,
  menuId: string,
): Promise<MenuNode | null> {
  const response = await client.request(GRAPHQL_QUERY_MENU, {
    variables: { id: menuId },
  });
  return (response.data?.menu as MenuNode | null) ?? null;
}

async function writeMenu(
  client: ReturnType<typeof createAdminApiClient>,
  menu: MenuNode,
  items: Array<Record<string, unknown>>,
): Promise<{ items: Array<{ id: string; title: string }>; error: string | null }> {
  const response = await client.request(GRAPHQL_MUTATION_MENU_UPDATE, {
    variables: { id: menu.id, title: menu.title, handle: null, items },
  });
  const payload = response.data?.menuUpdate;
  const error = (payload?.userErrors ?? [])
    .map((userError: { message: string }) => userError.message)
    .join("; ");
  return { items: payload?.menu?.items ?? [], error: error || null };
}

/**
 * Reconciles every scheduled menu item with reality: inserts items whose
 * window (in the shop's timezone) contains today and removes ours once the
 * window has passed. Only the item we created is ever touched; if the
 * merchant deleted it manually we accept that and stand down.
 */
async function syncMenus(db: PrismaClient): Promise<string> {
  const scheduled = await db.scheduledMenuItem.findMany({
    where: { enabled: true },
  });
  const needsRemoval = await db.scheduledMenuItem.findMany({
    where: { enabled: false, appliedMenuItemId: { not: null } },
  });
  const all = [...scheduled, ...needsRemoval];
  if (all.length === 0) return "no scheduled menu items";

  const shops = [...new Set(all.map((item) => item.shop))];

  const [sessions, shopData] = await Promise.all([
    db.session.findMany({
      where: { shop: { in: shops }, isOnline: false },
      select: { shop: true, accessToken: true },
    }),
    db.shopifyShopData.findMany({
      where: { shopifyStore: { shop: { in: shops } } },
      select: { ianaTimezone: true, shopifyStore: { select: { shop: true } } },
    }),
  ]);
  const tokenByShop = new Map(
    sessions
      .filter((session) => session.accessToken)
      .map((session) => [session.shop, session.accessToken!]),
  );
  const timezoneByShop = new Map(
    shopData.map((entry) => [entry.shopifyStore?.shop, entry.ianaTimezone]),
  );

  let applied = 0;
  let removed = 0;
  let failed = 0;

  for (const item of all) {
    const accessToken = tokenByShop.get(item.shop);
    if (!accessToken) continue;

    const today = todayInTimeZone(timezoneByShop.get(item.shop));
    const shouldBeLive =
      item.enabled && item.startDate <= today && item.endDate >= today;
    const isLive = Boolean(item.appliedMenuItemId);
    if (shouldBeLive === isLive) continue;

    const client = createAdminApiClient({
      apiVersion: API_VERSION,
      storeDomain: item.shop,
      accessToken,
    });

    try {
      const menu = await readMenu(client, item.menuId);
      if (!menu) {
        throw new Error("Menu no longer exists");
      }
      const existing = menu.items.map(toUpdateInput);

      if (shouldBeLive) {
        // Idempotence: if an item with our title already exists, adopt it
        const already = menu.items.find(
          (node) => node.title === item.itemTitle,
        );
        if (already) {
          await db.scheduledMenuItem.update({
            where: { id: item.id },
            data: {
              appliedMenuItemId: already.id,
              appliedAt: new Date(),
              lastError: null,
            },
          });
          applied++;
          continue;
        }

        const beforeIds = new Set(menu.items.map((node) => node.id));
        const newItem =
          item.linkType === "COLLECTION" && item.resourceId
            ? {
                title: item.itemTitle,
                type: "COLLECTION",
                resourceId: item.resourceId,
                tags: [],
                items: [],
              }
            : { title: item.itemTitle, type: "HTTP", url: item.url ?? "/", tags: [], items: [] };

        const result = await writeMenu(client, menu, [...existing, newItem]);
        if (result.error) throw new Error(result.error);

        const created = result.items.find(
          (node) => !beforeIds.has(node.id) && node.title === item.itemTitle,
        );
        await db.scheduledMenuItem.update({
          where: { id: item.id },
          data: {
            appliedMenuItemId: created?.id ?? null,
            appliedAt: new Date(),
            lastError: null,
          },
        });
        applied++;
      } else {
        // Remove exactly our item; if the merchant already removed it, accept
        const stillThere = menu.items.some(
          (node) => node.id === item.appliedMenuItemId,
        );
        if (stillThere) {
          const result = await writeMenu(
            client,
            menu,
            existing.filter((node) => node.id !== item.appliedMenuItemId),
          );
          if (result.error) throw new Error(result.error);
        }
        await db.scheduledMenuItem.update({
          where: { id: item.id },
          data: {
            appliedMenuItemId: null,
            removedAt: new Date(),
            lastError: null,
          },
        });
        removed++;
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`menu-sync failed for ${item.shop} item ${item.id}:`, error);
      await db.scheduledMenuItem
        .update({
          where: { id: item.id },
          data: { lastError: message.slice(0, 500) },
        })
        .catch(() => {});
    }
  }

  return `applied ${applied}, removed ${removed}, failed ${failed}`;
}

export const menuSyncJob: Job = {
  name: "menu-sync",
  everyMinutes: 14, // effectively every tick on a 15-minute heartbeat
  run: syncMenus,
};

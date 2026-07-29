import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Checkbox,
  InlineGrid,
  InlineStack,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { StoreMenu } from "app/routes/api.menus/route";

export type MenuItemConfig = {
  enabled: boolean;
  menuId: string;
  menuTitle: string;
  itemTitle: string;
  linkType: "COLLECTION" | "URL";
  resourceId: string | null;
  resourceTitle?: string | null;
  url: string | null;
  startDate: string;
  endDate: string;
  live: boolean;
  lastError: string | null;
};

type Props = {
  specialDateName: string;
  specialDateDate: string;
  menuItem: MenuItemConfig | null;
};

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function defaultStart(dateIso: string): string {
  const date = new Date(dateIso + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - 14);
  return isoDay(date);
}

type PickedCollection = { id: string; title?: string };

/**
 * Schedules a navigation menu item for this date. The background menu-sync
 * job (Cloud Scheduler heartbeat) inserts it when the window opens and
 * removes it when the window closes — nothing changes instantly on save.
 */
export default function MenuScheduler({
  specialDateName,
  specialDateDate,
  menuItem,
}: Props) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const menusFetcher = useFetcher<{
    menus: StoreMenu[];
    scopeMissing: boolean;
  }>();
  const saving = fetcher.state !== "idle";

  const [enabled, setEnabled] = useState(menuItem?.enabled ?? true);
  const [menuId, setMenuId] = useState(menuItem?.menuId ?? "");
  const [itemTitle, setItemTitle] = useState(
    menuItem?.itemTitle ?? specialDateName,
  );
  const [linkType, setLinkType] = useState<"COLLECTION" | "URL">(
    menuItem?.linkType ?? "COLLECTION",
  );
  const [resourceId, setResourceId] = useState(menuItem?.resourceId ?? "");
  const [resourceTitle, setResourceTitle] = useState(
    menuItem?.resourceTitle ?? "",
  );
  const [url, setUrl] = useState(menuItem?.url ?? "");
  const [startDate, setStartDate] = useState(
    menuItem?.startDate ?? defaultStart(specialDateDate),
  );
  const [endDate, setEndDate] = useState(menuItem?.endDate ?? specialDateDate);

  useEffect(() => {
    menusFetcher.load("/api/menus");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menus = menusFetcher.data?.menus ?? [];
  const scopeMissing = menusFetcher.data?.scopeMissing ?? false;

  // Default to the main menu once menus load
  useEffect(() => {
    if (!menuId && menus.length) {
      const main =
        menus.find((menu) => menu.handle === "main-menu") ?? menus[0];
      setMenuId(main.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menus.length]);

  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
    startDate <= endDate;
  const validLink =
    linkType === "COLLECTION" ? Boolean(resourceId) : Boolean(url.trim());

  const pickCollection = async () => {
    const selected = (await shopify.resourcePicker({
      type: "collection",
      multiple: false,
    })) as PickedCollection[] | undefined;
    const collection = selected?.[0];
    if (collection?.id) {
      setResourceId(collection.id);
      setResourceTitle(collection.title ?? "Collection");
    }
  };

  const save = () => {
    const menu = menus.find((entry) => entry.id === menuId);
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save-menu-item",
          enabled,
          menuId,
          menuTitle: menu?.title ?? menuItem?.menuTitle ?? "Menu",
          itemTitle,
          linkType,
          resourceId: linkType === "COLLECTION" ? resourceId : undefined,
          resourceTitle:
            linkType === "COLLECTION" ? resourceTitle || undefined : undefined,
          url: linkType === "URL" ? url.trim() : undefined,
          startDate,
          endDate,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Menu item scheduled");
  };

  const remove = () => {
    fetcher.submit(
      { body: JSON.stringify({ action: "remove-menu-item" }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Menu item removed");
  };

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center">
        {menuItem ? (
          <Badge
            tone={
              menuItem.live ? "success" : menuItem.enabled ? "info" : undefined
            }
          >
            {menuItem.live
              ? "Live in menu"
              : menuItem.enabled
                ? "Scheduled"
                : "Paused"}
          </Badge>
        ) : null}
        <Text as="p" tone="subdued" variant="bodySm">
          Adds a link to your store navigation during the window and removes
          it after. Changes are applied by a background sync within ~15
          minutes of the window opening or closing.
        </Text>
      </InlineStack>

      {menuItem?.lastError ? (
        <Banner tone="warning" title={`Last sync issue: ${menuItem.lastError}`} />
      ) : null}

      {scopeMissing ? (
        <Banner tone="warning" title="Navigation access isn't enabled yet">
          <p>
            Add the <code>read_online_store_navigation</code> and{" "}
            <code>write_online_store_navigation</code> access scopes to your
            app configuration, redeploy, and approve the new permission —
            then your menus will appear here.
          </p>
        </Banner>
      ) : (
        <>
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <Select
              label="Menu"
              options={menus.map((menu) => ({
                label: `${menu.title} (${menu.itemsCount} items)`,
                value: menu.id,
              }))}
              value={menuId}
              onChange={setMenuId}
              disabled={menus.length === 0}
            />
            <TextField
              label="Menu item text"
              autoComplete="off"
              value={itemTitle}
              onChange={setItemTitle}
              maxLength={40}
              showCharacterCount
            />
          </InlineGrid>

          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd">
                Links to
              </Text>
              <ButtonGroup variant="segmented">
                <Button
                  pressed={linkType === "COLLECTION"}
                  onClick={() => setLinkType("COLLECTION")}
                >
                  Collection
                </Button>
                <Button
                  pressed={linkType === "URL"}
                  onClick={() => setLinkType("URL")}
                >
                  URL
                </Button>
              </ButtonGroup>
            </InlineStack>

            {linkType === "COLLECTION" ? (
              <InlineStack gap="200" blockAlign="center">
                <Button onClick={pickCollection}>
                  {resourceId ? "Change collection" : "Choose collection"}
                </Button>
                {resourceTitle ? (
                  <Text as="span" variant="bodySm" tone="subdued">
                    {resourceTitle}
                  </Text>
                ) : null}
              </InlineStack>
            ) : (
              <TextField
                label="URL"
                labelHidden
                autoComplete="off"
                value={url}
                onChange={setUrl}
                placeholder="/collections/valentines-day or https://…"
              />
            )}
          </BlockStack>

          <InlineGrid columns={{ xs: 2 }} gap="400">
            <TextField
              label="Show from"
              type="date"
              autoComplete="off"
              value={startDate}
              onChange={setStartDate}
            />
            <TextField
              label="Until"
              type="date"
              autoComplete="off"
              value={endDate}
              onChange={setEndDate}
              error={
                validDates || !endDate ? undefined : "Must be after the start"
              }
            />
          </InlineGrid>

          <InlineStack gap="300" blockAlign="center">
            <Button
              variant="primary"
              onClick={save}
              loading={saving}
              disabled={
                !menuId || !itemTitle.trim() || !validLink || !validDates || saving
              }
            >
              {menuItem ? "Save changes" : "Schedule menu item"}
            </Button>
            <Checkbox label="Enabled" checked={enabled} onChange={setEnabled} />
            {menuItem ? (
              <Button variant="tertiary" tone="critical" onClick={remove}>
                Remove
              </Button>
            ) : null}
          </InlineStack>
        </>
      )}
    </BlockStack>
  );
}

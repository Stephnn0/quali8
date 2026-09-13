/**
 * Deep links into the theme editor for the Smart Recommendations setup
 * card: one adds the home page block, one turns on the tracker embed.
 * The extension uid is the `uid` in extensions/theme-quali8/shopify.extension.toml;
 * a dev app with its own uid can override it with SHOPIFY_THEME_EXTENSION_UID.
 */

export const THEME_EXTENSION_UID_FALLBACK = "1f374334-5b35-41d0-63a6-71f08e77864cb4c3ceff";

export type ThemeEditorLinks = {
  addBlock: string;
  enableTracker: string;
};

export function themeEditorLinks(shop: string, extensionUid: string): ThemeEditorLinks {
  const editor = `https://${shop}/admin/themes/current/editor`;
  const addBlock = new URLSearchParams({
    context: "apps",
    template: "index",
    addAppBlockId: `${extensionUid}/smart-recommendations`,
    target: "newAppsSection",
  });
  const enableTracker = new URLSearchParams({
    context: "apps",
    activateAppId: `${extensionUid}/smart-tracker`,
  });
  return {
    addBlock: `${editor}?${addBlock.toString()}`,
    enableTracker: `${editor}?${enableTracker.toString()}`,
  };
}

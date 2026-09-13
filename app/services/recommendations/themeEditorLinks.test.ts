import { describe, expect, it } from "vitest";
import { themeEditorLinks } from "./themeEditorLinks";

describe("themeEditorLinks", () => {
  it("builds the add-block and enable-embed editor URLs for the shop", () => {
    const links = themeEditorLinks("my-shop.myshopify.com", "abc-123");
    expect(links.addBlock).toBe(
      "https://my-shop.myshopify.com/admin/themes/current/editor?context=apps&template=index&addAppBlockId=abc-123%2Fsmart-recommendations&target=newAppsSection",
    );
    expect(links.enableTracker).toBe(
      "https://my-shop.myshopify.com/admin/themes/current/editor?context=apps&activateAppId=abc-123%2Fsmart-tracker",
    );
  });
});

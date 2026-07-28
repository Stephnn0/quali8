import { describe, it, expect, vi } from "vitest";
import {
  findUnpublishedProducts,
  getProductsPublicationStatus,
} from "./products";

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: "gid://shopify/Product/1",
    title: "Snowboard",
    status: "ACTIVE",
    publishedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("findUnpublishedProducts", () => {
  it("returns an empty list when every product is active and published", () => {
    expect(
      findUnpublishedProducts([
        product(),
        product({ id: "gid://shopify/Product/2", title: "Wax" }),
      ]),
    ).toEqual([]);
  });

  it("flags products never published to the online store", () => {
    const unpublished = product({ title: "iPhone", publishedAt: null });
    expect(findUnpublishedProducts([product(), unpublished])).toEqual([
      unpublished,
    ]);
  });

  it("flags draft and archived products even when publishedAt is set", () => {
    const draft = product({ title: "Draft", status: "DRAFT" });
    const archived = product({ title: "Archived", status: "ARCHIVED" });
    expect(findUnpublishedProducts([product(), draft, archived])).toEqual([
      draft,
      archived,
    ]);
  });
});

describe("getProductsPublicationStatus", () => {
  it("queries the ids and returns only Product nodes", async () => {
    const graphql = vi.fn().mockResolvedValue({
      json: async () => ({
        data: {
          nodes: [
            product(),
            // Deleted products come back as null from `nodes`.
            null,
          ],
        },
      }),
    });

    const result = await getProductsPublicationStatus(graphql as never, [
      "gid://shopify/Product/1",
      "gid://shopify/Product/999",
    ]);

    expect(graphql).toHaveBeenCalledOnce();
    expect(graphql.mock.calls[0][1]).toEqual({
      variables: {
        ids: ["gid://shopify/Product/1", "gid://shopify/Product/999"],
      },
    });
    expect(result).toEqual([product()]);
  });
});

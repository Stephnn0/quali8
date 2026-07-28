import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  Spinner,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { MagicIcon, SearchIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";

type ResourceType = "PRODUCT" | "COLLECTION";

type Resource = {
  id: string;
  title: string;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Suggestion = { seoTitle: string; seoDescription: string };

type AppliedAction = {
  id: number;
  resourceType: string;
  resourceTitle: string;
  newSeoTitle: string;
  createdAt: string;
};

type Props = {
  specialDateId: number;
  specialDateName: string;
  appliedActions: AppliedAction[];
};

/**
 * The first executable action on a special date: browse products and
 * collections, batch-generate occasion-optimized SEO metadata with AI,
 * review/edit inline, and apply.
 */
export default function SeoOptimizer({
  specialDateId,
  specialDateName,
  appliedActions,
}: Props) {
  const shopify = useAppBridge();

  const listFetcher = useFetcher<{ items: Resource[] }>();
  const suggestFetcher = useFetcher<{
    code: string;
    suggestions?: Array<{ id: string } & Suggestion>;
    errors: Array<{ message: string }> | null;
  }>();
  const applyFetcher = useFetcher<{
    code: string;
    results?: Array<{ id: string; ok: boolean; message: string | null }>;
    errors: Array<{ message: string }> | null;
  }>();

  const [type, setType] = useState<ResourceType>("PRODUCT");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [error, setError] = useState<string | null>(null);

  const items = listFetcher.data?.items ?? [];
  const listing = listFetcher.state !== "idle";
  const suggesting = suggestFetcher.state !== "idle";
  const applying = applyFetcher.state !== "idle";

  const load = (nextType: ResourceType, nextSearch: string) => {
    listFetcher.load(
      `/api/seo-meta?type=${nextType}&search=${encodeURIComponent(nextSearch)}`,
    );
  };

  // Initial load + debounced search
  useEffect(() => {
    const timeout = setTimeout(() => load(type, search), search ? 400 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, search]);

  // Consume suggestion results
  useEffect(() => {
    const data = suggestFetcher.data;
    if (suggestFetcher.state !== "idle" || !data) return;
    if (data.errors?.length) {
      setError(data.errors[0].message);
      return;
    }
    if (data.suggestions) {
      setError(null);
      setSuggestions((current) => {
        const next = { ...current };
        for (const suggestion of data.suggestions!) {
          next[suggestion.id] = {
            seoTitle: suggestion.seoTitle,
            seoDescription: suggestion.seoDescription,
          };
        }
        return next;
      });
    }
  }, [suggestFetcher.state, suggestFetcher.data]);

  // Consume apply results
  useEffect(() => {
    const data = applyFetcher.data;
    if (applyFetcher.state !== "idle" || !data) return;
    if (data.errors?.length) {
      setError(data.errors[0].message);
      return;
    }
    if (data.results) {
      const succeeded = data.results.filter((result) => result.ok);
      const failed = data.results.filter((result) => !result.ok);
      if (succeeded.length) {
        shopify.toast.show(
          `SEO updated for ${succeeded.length} ${succeeded.length === 1 ? "item" : "items"}`,
        );
        setSuggestions((current) => {
          const next = { ...current };
          for (const result of succeeded) delete next[result.id];
          return next;
        });
        setSelected((current) => {
          const next = new Set(current);
          for (const result of succeeded) next.delete(result.id);
          return next;
        });
        load(type, search);
      }
      setError(failed.length ? (failed[0].message ?? "Some items failed") : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyFetcher.state, applyFetcher.data]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const generate = () => {
    const chosen = items.filter((item) => selected.has(item.id));
    if (!chosen.length) return;
    setError(null);
    suggestFetcher.submit(
      {
        body: JSON.stringify({
          action: "suggest",
          specialDateId,
          items: chosen.map((item) => ({
            id: item.id,
            title: item.title,
            seoTitle: item.seoTitle,
            seoDescription: item.seoDescription,
          })),
        }),
      },
      { method: "POST", encType: "multipart/form-data", action: "/api/seo-meta" },
    );
  };

  const editSuggestion = (id: string, patch: Partial<Suggestion>) => {
    setSuggestions((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const apply = (ids: string[]) => {
    const payload = ids
      .map((id) => {
        const item = items.find((entry) => entry.id === id);
        const suggestion = suggestions[id];
        if (!item || !suggestion) return null;
        return {
          id,
          type,
          resourceTitle: item.title,
          previousSeoTitle: item.seoTitle,
          previousSeoDescription: item.seoDescription,
          seoTitle: suggestion.seoTitle,
          seoDescription: suggestion.seoDescription,
        };
      })
      .filter(Boolean);
    if (!payload.length) return;
    applyFetcher.submit(
      { body: JSON.stringify({ action: "apply", specialDateId, items: payload }) },
      { method: "POST", encType: "multipart/form-data", action: "/api/seo-meta" },
    );
  };

  const readyIds = items
    .map((item) => item.id)
    .filter((id) => suggestions[id]);

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            SEO for {specialDateName}
          </Text>
          <Text as="p" tone="subdued" variant="bodySm">
            Pick products or collections, generate metadata optimized for
            this date, review, and apply — changes go live on your store
            immediately.
          </Text>
        </BlockStack>

        {error ? <Banner tone="warning" title={error} /> : null}

        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <ButtonGroup variant="segmented">
            <Button
              pressed={type === "PRODUCT"}
              onClick={() => {
                setType("PRODUCT");
                setSelected(new Set());
              }}
            >
              Products
            </Button>
            <Button
              pressed={type === "COLLECTION"}
              onClick={() => {
                setType("COLLECTION");
                setSelected(new Set());
              }}
            >
              Collections
            </Button>
          </ButtonGroup>
          <div style={{ flex: 1 }}>
            <TextField
              label="Search"
              labelHidden
              autoComplete="off"
              prefix={<SearchIcon width={16} />}
              value={search}
              onChange={setSearch}
              placeholder={`Search ${type === "PRODUCT" ? "products" : "collections"}`}
              clearButton
              onClearButtonClick={() => setSearch("")}
            />
          </div>
          <Button
            icon={MagicIcon}
            variant="primary"
            onClick={generate}
            loading={suggesting}
            disabled={selected.size === 0 || suggesting}
          >
            {`Generate for ${selected.size || ""} selected`.trim()}
          </Button>
        </InlineStack>

        {listing ? (
          <InlineStack align="center">
            <Spinner size="small" accessibilityLabel="Loading resources" />
          </InlineStack>
        ) : (
          <BlockStack gap="300">
            {items.map((item) => {
              const suggestion = suggestions[item.id];
              return (
                <BlockStack key={item.id} gap="200">
                  <InlineStack gap="300" blockAlign="start" wrap={false}>
                    <Checkbox
                      label=""
                      labelHidden
                      checked={selected.has(item.id)}
                      onChange={(checked) => toggleSelect(item.id, checked)}
                    />
                    <Thumbnail
                      source={item.imageUrl ?? ""}
                      alt={item.title}
                      size="small"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" fontWeight="medium">
                          {item.title}
                        </Text>
                        {!item.seoTitle && !item.seoDescription ? (
                          <Badge tone="attention" size="small">
                            No metadata
                          </Badge>
                        ) : null}
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued" truncate>
                        {item.seoTitle ?? "No meta title"}
                        {" · "}
                        {item.seoDescription ?? "No meta description"}
                      </Text>
                    </div>
                    {suggestion ? (
                      <Button
                        onClick={() => apply([item.id])}
                        loading={applying}
                        size="slim"
                      >
                        Apply
                      </Button>
                    ) : null}
                  </InlineStack>

                  {suggestion ? (
                    <div style={{ paddingLeft: "4.5rem" }}>
                      <BlockStack gap="200">
                        <TextField
                          label="Suggested meta title"
                          autoComplete="off"
                          value={suggestion.seoTitle}
                          onChange={(value) =>
                            editSuggestion(item.id, { seoTitle: value })
                          }
                          maxLength={70}
                          showCharacterCount
                        />
                        <TextField
                          label="Suggested meta description"
                          autoComplete="off"
                          multiline={2}
                          value={suggestion.seoDescription}
                          onChange={(value) =>
                            editSuggestion(item.id, { seoDescription: value })
                          }
                          maxLength={180}
                          showCharacterCount
                        />
                      </BlockStack>
                    </div>
                  ) : null}
                </BlockStack>
              );
            })}
            {items.length === 0 ? (
              <Text as="p" tone="subdued">
                Nothing found{search ? ` for “${search}”` : ""}.
              </Text>
            ) : null}
          </BlockStack>
        )}

        {readyIds.length > 1 ? (
          <InlineStack align="end">
            <Button
              variant="primary"
              onClick={() => apply(readyIds)}
              loading={applying}
            >
              {`Apply all ${readyIds.length}`}
            </Button>
          </InlineStack>
        ) : null}

        {appliedActions.length > 0 ? (
          <BlockStack gap="200">
            <Divider />
            <Text as="h3" variant="headingSm">
              Applied changes
            </Text>
            {appliedActions.map((entry) => (
              <InlineStack key={entry.id} gap="200" blockAlign="center">
                <Badge size="small">
                  {entry.resourceType === "PRODUCT" ? "Product" : "Collection"}
                </Badge>
                <Text as="span" variant="bodySm">
                  {entry.resourceTitle}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued" truncate>
                  → {entry.newSeoTitle}
                </Text>
              </InlineStack>
            ))}
          </BlockStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}

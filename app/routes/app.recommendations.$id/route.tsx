import { useEffect, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  PageActions,
  Select,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FeatureEyebrow } from "app/components/OneApp";
import type { RuleSourceProduct } from "app/services/recommendations/smartRecommendations.server";
import { loader, type RuleDetail } from "./loader";
import { action } from "./action";

export { loader, action };

const MAX_PRODUCTS = 12;

type Picked = { id: string; title: string; imageUrl: string | null };

type PickedProduct = {
  id: string;
  title?: string;
  images?: Array<{ originalSrc?: string; src?: string }>;
};

type PickedCollection = {
  id: string;
  title?: string;
  image?: { originalSrc?: string; src?: string } | null;
};

const TRIGGER_OPTIONS = [
  { label: "Every cart", value: "ALWAYS" },
  { label: "Cart has a product from a collection", value: "CART_HAS_COLLECTION" },
  { label: "Cart has a specific product", value: "CART_HAS_PRODUCT" },
  { label: "Cart total is at least…", value: "CART_TOTAL_MIN" },
];

const SOURCE_OPTIONS = [
  { label: "Products from a collection", value: "COLLECTION" },
  { label: "Products with a tag", value: "TAG" },
  { label: "Newest products", value: "NEWEST" },
  { label: "Products I pick", value: "PRODUCTS" },
];

const numberOrNull = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function RecommendationRuleEditor() {
  const loaderData = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const isNew = params.id === "new";
  const rule: RuleDetail | null = loaderData?.payload?.rule ?? null;
  const notFound = !isNew && loaderData?.code === "not_found";

  const [name, setName] = useState(rule?.name ?? "");
  const [heading, setHeading] = useState(rule?.heading ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(rule?.status ?? "ACTIVE");
  const [trigger, setTrigger] = useState<RuleDetail["trigger"]>(rule?.trigger ?? "ALWAYS");
  const [triggerCollection, setTriggerCollection] = useState<Picked | null>(
    rule?.triggerCollectionId
      ? { id: rule.triggerCollectionId, title: rule.triggerCollectionTitle ?? "", imageUrl: null }
      : null,
  );
  const [triggerProduct, setTriggerProduct] = useState<Picked | null>(
    rule?.triggerProductId
      ? { id: rule.triggerProductId, title: rule.triggerProductTitle ?? "", imageUrl: null }
      : null,
  );
  const [triggerMinTotal, setTriggerMinTotal] = useState(
    rule?.triggerMinTotal !== null && rule?.triggerMinTotal !== undefined
      ? String(rule.triggerMinTotal)
      : "",
  );
  const [source, setSource] = useState<RuleDetail["source"]>(rule?.source ?? "COLLECTION");
  const [sourceCollection, setSourceCollection] = useState<Picked | null>(
    rule?.sourceCollectionId
      ? { id: rule.sourceCollectionId, title: rule.sourceCollectionTitle ?? "", imageUrl: null }
      : null,
  );
  const [sourceTag, setSourceTag] = useState(rule?.sourceTag ?? "");
  const [sourceProducts, setSourceProducts] = useState<RuleSourceProduct[]>(
    rule?.sourceProducts ?? [],
  );
  const [minPrice, setMinPrice] = useState(
    rule?.minPrice !== null && rule?.minPrice !== undefined ? String(rule.minPrice) : "",
  );
  const [maxPrice, setMaxPrice] = useState(
    rule?.maxPrice !== null && rule?.maxPrice !== undefined ? String(rule.maxPrice) : "",
  );
  const [limit, setLimit] = useState(String(rule?.limit ?? 4));
  const [excludeCartItems, setExcludeCartItems] = useState(rule?.excludeCartItems ?? true);

  const saving = fetcher.state !== "idle";
  const actionData = fetcher.data as
    | { code: string; errors: Array<{ message: string }> | null }
    | undefined;

  useEffect(() => {
    if (actionData?.code === "saved") {
      shopify.toast.show("Rule saved");
      navigate("/app/recommendations");
    }
  }, [actionData, navigate, shopify]);

  const pickCollection = async (current: Picked | null, set: (value: Picked | null) => void) => {
    const selected = (await shopify.resourcePicker({
      type: "collection",
      multiple: false,
      selectionIds: current ? [{ id: current.id }] : [],
    })) as PickedCollection[] | undefined;
    const collection = selected?.[0];
    if (!collection) return;
    set({
      id: collection.id,
      title: collection.title || "Untitled collection",
      imageUrl: collection.image?.originalSrc || collection.image?.src || null,
    });
  };

  const pickTriggerProduct = async () => {
    const selected = (await shopify.resourcePicker({
      type: "product",
      multiple: false,
      selectionIds: triggerProduct ? [{ id: triggerProduct.id }] : [],
      filter: { variants: false },
    })) as PickedProduct[] | undefined;
    const product = selected?.[0];
    if (!product) return;
    setTriggerProduct({
      id: product.id,
      title: product.title || "Untitled product",
      imageUrl: product.images?.[0]?.originalSrc || product.images?.[0]?.src || null,
    });
  };

  const pickSourceProducts = async () => {
    const selected = (await shopify.resourcePicker({
      type: "product",
      multiple: MAX_PRODUCTS,
      selectionIds: sourceProducts.map((product) => ({ id: product.productId })),
      filter: { variants: false },
    })) as PickedProduct[] | undefined;
    if (!selected) return;
    setSourceProducts(
      selected.slice(0, MAX_PRODUCTS).map((product) => ({
        productId: product.id,
        title: product.title || "Untitled product",
        imageUrl: product.images?.[0]?.originalSrc || product.images?.[0]?.src || null,
      })),
    );
  };

  const save = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          id: rule?.id ?? null,
          name,
          heading: heading || null,
          status,
          trigger,
          triggerCollectionId: triggerCollection?.id ?? null,
          triggerCollectionTitle: triggerCollection?.title ?? null,
          triggerProductId: triggerProduct?.id ?? null,
          triggerProductTitle: triggerProduct?.title ?? null,
          triggerMinTotal: numberOrNull(triggerMinTotal),
          source,
          sourceCollectionId: sourceCollection?.id ?? null,
          sourceCollectionTitle: sourceCollection?.title ?? null,
          sourceTag: sourceTag || null,
          sourceProducts,
          minPrice: numberOrNull(minPrice),
          maxPrice: numberOrNull(maxPrice),
          limit: Math.min(12, Math.max(1, Number.parseInt(limit, 10) || 4)),
          excludeCartItems,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
  };

  if (notFound) {
    return (
      <Page
        title="Rule"
        backAction={{ onAction: () => navigate("/app/recommendations") }}
      >
        <Banner tone="critical" title="This rule no longer exists" />
      </Page>
    );
  }

  const pickedRow = (picked: Picked, onRemove: () => void) => (
    <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
      <InlineStack gap="300" blockAlign="center" wrap={false}>
        <Thumbnail source={picked.imageUrl ?? ""} alt={picked.title} size="small" />
        <Text as="span" variant="bodyMd">
          {picked.title}
        </Text>
      </InlineStack>
      <Button icon={DeleteIcon} variant="tertiary" accessibilityLabel="Remove" onClick={onRemove} />
    </InlineStack>
  );

  return (
    <Page
      title={isNew ? "Create rule" : (rule?.name ?? "Rule")}
      titleMetadata={<FeatureEyebrow featureKey="smart-recommendations" />}
      backAction={{ onAction: () => navigate("/app/recommendations") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.errors?.length ? (
              <Banner tone="critical" title={actionData.errors[0].message} />
            ) : null}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Rule
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                  <TextField
                    label="Name"
                    autoComplete="off"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Vases for bouquets"
                    helpText="Only you see this."
                  />
                  <Select
                    label="Status"
                    options={[
                      { label: "Active", value: "ACTIVE" },
                      { label: "Paused", value: "INACTIVE" },
                    ]}
                    value={status}
                    onChange={(value) => setStatus(value === "ACTIVE" ? "ACTIVE" : "INACTIVE")}
                  />
                </InlineGrid>
                <TextField
                  label="Storefront heading (optional)"
                  autoComplete="off"
                  value={heading}
                  onChange={setHeading}
                  placeholder="e.g. Complete the look"
                  helpText="Replaces the block's heading when this rule matches."
                  maxLength={80}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    When
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    The condition the cart must meet for this rule to apply.
                  </Text>
                </BlockStack>
                <Select
                  label="Condition"
                  options={TRIGGER_OPTIONS}
                  value={trigger}
                  onChange={(value) => setTrigger(value as RuleDetail["trigger"])}
                />
                {trigger === "CART_HAS_COLLECTION" ? (
                  <BlockStack gap="200">
                    {triggerCollection
                      ? pickedRow(triggerCollection, () => setTriggerCollection(null))
                      : null}
                    <InlineStack>
                      <Button onClick={() => pickCollection(triggerCollection, setTriggerCollection)}>
                        {triggerCollection ? "Change collection" : "Choose collection"}
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : null}
                {trigger === "CART_HAS_PRODUCT" ? (
                  <BlockStack gap="200">
                    {triggerProduct ? pickedRow(triggerProduct, () => setTriggerProduct(null)) : null}
                    <InlineStack>
                      <Button onClick={pickTriggerProduct}>
                        {triggerProduct ? "Change product" : "Choose product"}
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : null}
                {trigger === "CART_TOTAL_MIN" ? (
                  <TextField
                    label="Minimum cart total"
                    type="number"
                    min={0}
                    autoComplete="off"
                    value={triggerMinTotal}
                    onChange={setTriggerMinTotal}
                    prefix="$"
                  />
                ) : null}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Show
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Where the recommended products come from.
                  </Text>
                </BlockStack>
                <Select
                  label="Source"
                  options={SOURCE_OPTIONS}
                  value={source}
                  onChange={(value) => setSource(value as RuleDetail["source"])}
                />
                {source === "COLLECTION" ? (
                  <BlockStack gap="200">
                    {sourceCollection
                      ? pickedRow(sourceCollection, () => setSourceCollection(null))
                      : null}
                    <InlineStack>
                      <Button onClick={() => pickCollection(sourceCollection, setSourceCollection)}>
                        {sourceCollection ? "Change collection" : "Choose collection"}
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : null}
                {source === "TAG" ? (
                  <TextField
                    label="Product tag"
                    autoComplete="off"
                    value={sourceTag}
                    onChange={setSourceTag}
                    placeholder="e.g. add-on"
                  />
                ) : null}
                {source === "PRODUCTS" ? (
                  <BlockStack gap="200">
                    {sourceProducts.map((product) => (
                      <div key={product.productId}>
                        {pickedRow(
                          { id: product.productId, title: product.title, imageUrl: product.imageUrl },
                          () =>
                            setSourceProducts((current) =>
                              current.filter((item) => item.productId !== product.productId),
                            ),
                        )}
                      </div>
                    ))}
                    <InlineStack>
                      <Button onClick={pickSourceProducts}>
                        {sourceProducts.length ? "Edit products" : "Pick products"}
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : null}

                <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                  <TextField
                    label="Min price"
                    type="number"
                    min={0}
                    autoComplete="off"
                    value={minPrice}
                    onChange={setMinPrice}
                    prefix="$"
                    placeholder="Any"
                  />
                  <TextField
                    label="Max price"
                    type="number"
                    min={0}
                    autoComplete="off"
                    value={maxPrice}
                    onChange={setMaxPrice}
                    prefix="$"
                    placeholder="Any"
                  />
                  <TextField
                    label="Max products"
                    type="number"
                    min={1}
                    max={12}
                    autoComplete="off"
                    value={limit}
                    onChange={setLimit}
                  />
                </InlineGrid>
                <Checkbox
                  label="Skip products already in the cart"
                  checked={excludeCartItems}
                  onChange={setExcludeCartItems}
                />
              </BlockStack>
            </Card>

            <PageActions
              primaryAction={{
                content: isNew ? "Create rule" : "Save changes",
                onAction: save,
                loading: saving,
                disabled: saving || name.trim().length === 0,
              }}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

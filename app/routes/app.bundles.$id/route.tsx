import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useNavigate, useParams } from "react-router";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { applyPercentDiscount } from "app/utils/bundlePricing";
import { FeatureEyebrow } from "app/components/OneApp";
import emptyImage from "app/assets/bundles-card.svg";
import { loader } from "./loader";
import { action } from "./action";
import { BundlePreview } from "./components/BundlePreview";
import type { BundleFormItemState, PickedProduct } from "./types";

export { loader, action };

type ActionData = {
  code: string;
  errors: Array<{ message: string }> | null;
};

const MIN_PRODUCTS = 2;
const MAX_PRODUCTS = 4;

export default function BundleForm() {
  const loaderData = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const isNew = params.id === "new";
  const bundle = loaderData?.payload?.bundle ?? null;
  const notFound = !isNew && loaderData?.code === "not_found";

  const [title, setTitle] = useState(bundle?.title ?? "Frequently bought together");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [status, setStatus] = useState(bundle?.status ?? "INACTIVE");
  const [discountPercent, setDiscountPercent] = useState(
    bundle ? String(bundle.discountPercent) : "",
  );
  const [items, setItems] = useState<BundleFormItemState[]>(
    bundle?.items.map((item) => ({
      variantId: item.variantId,
      productId: item.productId ?? "",
      quantity: 1,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      price: item.price,
      imageUrl: item.imageUrl,
    })) ?? [],
  );

  const percent = parseFloat(discountPercent) || 0;

  const actionData = fetcher.data as ActionData | undefined;
  const saving = fetcher.state !== "idle";

  useEffect(() => {
    if (actionData?.code === "saved") {
      shopify.toast.show("Bundle saved");
      navigate("/app/bundles");
    }
  }, [actionData, navigate, shopify]);

  const pickProducts = async () => {
    const selected = (await shopify.resourcePicker({
      type: "product",
      multiple: MAX_PRODUCTS,
      selectionIds: items.map((item) => ({ id: item.productId })),
      filter: { variants: false },
    })) as PickedProduct[] | undefined;

    if (!selected) return; // Merchant cancelled — keep the current selection.

    const next: BundleFormItemState[] = [];
    for (const product of selected) {
      // The bundle stores each product's default (first) variant so the
      // storefront can add it to the cart.
      const variant = product.variants?.[0];
      if (!variant?.id) continue;
      // Duplicate prevention: a product can appear in the bundle only once.
      if (next.some((item) => item.productId === product.id)) continue;

      next.push({
        variantId: variant.id,
        productId: product.id,
        quantity: 1,
        productTitle: product.title || "Untitled product",
        variantTitle:
          variant.title && variant.title !== "Default Title" ? variant.title : null,
        price: parseFloat(variant.price ?? "") || 0,
        imageUrl:
          product.images?.[0]?.originalSrc || product.images?.[0]?.src || null,
      });
    }
    setItems(next.slice(0, MAX_PRODUCTS));
  };

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const canSave =
    !saving &&
    title.trim().length > 0 &&
    items.length >= MIN_PRODUCTS &&
    items.length <= MAX_PRODUCTS &&
    percent > 0 &&
    percent < 100;

  const handleSave = () => {
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      discountPercent: percent,
      items,
    };

    fetcher.submit(
      { body: JSON.stringify(body) },
      {
        method: isNew ? "POST" : "PUT",
        encType: "multipart/form-data",
      },
    );
  };

  if (notFound) {
    return (
      <Page
        title="Bundle not found"
        titleMetadata={<FeatureEyebrow featureKey="bundle-builder" />}
      >
        <Card>
          <EmptyState
            heading="This bundle doesn't exist"
            image={emptyImage}
            action={{
              content: "Back to bundles",
              onAction: () => navigate("/app/bundles"),
            }}
          >
            <p>It may have been deleted.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title={isNew ? "Create bundle" : "Edit bundle"}
      titleMetadata={<FeatureEyebrow featureKey="bundle-builder" />}
      backAction={{ content: "Bundles", onAction: () => navigate("/app/bundles") }}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        disabled: !canSave,
        loading: saving,
      }}
    >
      <Layout>
        {actionData?.errors?.length ? (
          <Layout.Section>
            <Banner title="Couldn't save the bundle" tone="critical">
              <BlockStack gap="100">
                {actionData.errors.map((error, index) => (
                  <Text as="p" key={index}>
                    {error.message}
                  </Text>
                ))}
              </BlockStack>
            </Banner>
          </Layout.Section>
        ) : null}

        <Layout.Section variant="oneHalf">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  General information
                </Text>
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  helpText="Shown as the heading of the storefront widget."
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  autoComplete="off"
                  multiline={3}
                  maxLength={1000}
                  helpText="Optional subtitle shown under the heading."
                />
                <Select
                  label="Status"
                  options={[
                    { label: "Active", value: "ACTIVE" },
                    { label: "Inactive", value: "INACTIVE" },
                  ]}
                  value={status}
                  onChange={(value) => setStatus(value as "ACTIVE" | "INACTIVE")}
                  helpText="Only active bundles are shown on your storefront."
                />
                <TextField
                  label="Discount percentage"
                  type="number"
                  min={1}
                  max={99}
                  value={discountPercent}
                  onChange={setDiscountPercent}
                  autoComplete="off"
                  suffix="%"
                  helpText="Percent off the combined product prices."
                  error={
                    discountPercent !== "" && (percent <= 0 || percent >= 100)
                      ? "Enter a percentage between 1 and 99"
                      : undefined
                  }
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Discounted products in bundle
                  </Text>
                  <Button onClick={pickProducts}>
                    {items.length ? "Edit products" : "Select products"}
                  </Button>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Select the products you want to offer in the bundle. Pick
                  between {MIN_PRODUCTS} and {MAX_PRODUCTS} products — smaller
                  bundles render faster and won't overwhelm your customers. The
                  bundle is shown on the product page of every product it
                  contains.
                </Text>
                {items.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No products selected yet.
                  </Text>
                ) : (
                  <BlockStack gap="300">
                    {items.map((item) => (
                      <InlineStack
                        key={item.productId}
                        gap="300"
                        blockAlign="center"
                        align="space-between"
                        wrap={false}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <Thumbnail
                            source={item.imageUrl || ""}
                            alt={item.productTitle}
                            size="small"
                          />
                          <BlockStack gap="050">
                            <Text as="span" fontWeight="semibold">
                              {item.productTitle}
                            </Text>
                            <Text as="span" tone="subdued">
                              {percent > 0 && percent < 100 ? (
                                <>
                                  <s>${item.price.toFixed(2)}</s>{" "}
                                  ${applyPercentDiscount(item.price, percent).toFixed(2)}
                                </>
                              ) : (
                                <>${item.price.toFixed(2)}</>
                              )}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <Button
                          icon={DeleteIcon}
                          accessibilityLabel="Remove product"
                          onClick={() => removeItem(item.productId)}
                        />
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
                {items.length === 1 ? (
                  <Text as="p" tone="critical">
                    Add at least one more product — a bundle needs{" "}
                    {MIN_PRODUCTS} to {MAX_PRODUCTS} products.
                  </Text>
                ) : null}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Widget preview
              </Text>
              <Text as="p" tone="subdued">
                This is how the bundle will look in your theme's app block.
              </Text>
              <BundlePreview
                title={title}
                description={description}
                discountPercent={percent}
                items={items}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

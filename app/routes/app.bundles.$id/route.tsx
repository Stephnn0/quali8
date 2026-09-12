import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData, useNavigate, useParams } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  PageActions,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, ImageIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { applyPercentDiscount, computeBundlePricing } from "app/utils/bundlePricing";
import { FeatureEyebrow } from "app/components/OneApp";
import illustration from "app/assets/bundle-card.svg";
import { loader } from "./loader";
import { action } from "./action";
import { BundlePreview } from "./components/BundlePreview";
import { SectionHead } from "./components/SectionHead";
import type { BundleFormItemState, PickedProduct } from "./types";
import styles from "../app.bundles._index/bundles.module.css";

export { loader, action };

type ActionData = {
  code: string;
  errors: Array<{ message: string }> | null;
};

const MIN_PRODUCTS = 2;
const MAX_PRODUCTS = 4;
const DISCOUNT_PICKS = [10, 15, 20, 25, 30];
const money = (value: number) => `$${value.toFixed(2)}`;

export default function BundleForm() {
  const loaderData = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const isNew = params.id === "new";
  const bundle = loaderData?.payload?.bundle ?? null;
  const notFound = !isNew && loaderData?.code === "not_found";

  const initial = useMemo(
    () => ({
      title: bundle?.title ?? "Frequently bought together",
      description: bundle?.description ?? "",
      // New bundles start active so they show up as soon as they're saved.
      status: (bundle?.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
      discountPercent: bundle ? String(bundle.discountPercent) : "",
      items:
        bundle?.items.map<BundleFormItemState>((item) => ({
          variantId: item.variantId,
          productId: item.productId ?? "",
          quantity: 1,
          productTitle: item.productTitle,
          variantTitle: item.variantTitle,
          price: item.price,
          imageUrl: item.imageUrl,
        })) ?? [],
    }),
    [bundle],
  );

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState(initial.status);
  const [discountPercent, setDiscountPercent] = useState(initial.discountPercent);
  const [items, setItems] = useState<BundleFormItemState[]>(initial.items);

  const percent = parseFloat(discountPercent) || 0;
  const percentValid = percent > 0 && percent < 100;
  const pricing = computeBundlePricing(items, percentValid ? percent : 0);

  const dirty =
    title !== initial.title ||
    description !== initial.description ||
    status !== initial.status ||
    discountPercent !== initial.discountPercent ||
    JSON.stringify(items) !== JSON.stringify(initial.items);

  const actionData = fetcher.data as ActionData | undefined;
  const saving = fetcher.state !== "idle";

  useEffect(() => {
    if (actionData?.code === "saved") {
      shopify.toast.show(isNew ? "Bundle created" : "Bundle saved");
      navigate("/app/bundles");
    }
  }, [actionData, navigate, shopify, isNew]);

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

  const removeItem = (productId: string) =>
    setItems((current) => current.filter((item) => item.productId !== productId));

  const canSave =
    !saving &&
    dirty &&
    title.trim().length > 0 &&
    items.length >= MIN_PRODUCTS &&
    items.length <= MAX_PRODUCTS &&
    percentValid;

  const handleSave = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          discountPercent: percent,
          items,
        }),
      },
      { method: isNew ? "POST" : "PUT", encType: "multipart/form-data" },
    );
  };

  const back = () => navigate("/app/bundles");

  if (notFound) {
    return (
      <Page
        title="Bundle not found"
        titleMetadata={<FeatureEyebrow featureKey="bundle-builder" />}
      >
        <Card>
          <EmptyState
            heading="This bundle doesn't exist"
            image={illustration}
            action={{ content: "Back to bundles", onAction: back }}
          >
            <p>It may have been deleted.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const productsHint =
    items.length === 0
      ? `Pick ${MIN_PRODUCTS} to ${MAX_PRODUCTS} products`
      : items.length < MIN_PRODUCTS
        ? `Add ${MIN_PRODUCTS - items.length} more`
        : `${items.length} of ${MAX_PRODUCTS} products`;

  return (
    <Page
      title={isNew ? "New bundle" : bundle?.title || "Edit bundle"}
      titleMetadata={<FeatureEyebrow featureKey="bundle-builder" />}
      backAction={{ content: "Bundle Builder", onAction: back }}
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

        <Layout.Section>
          <BlockStack gap="400">
            {/* 1 · Products */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="300">
                  <SectionHead
                    number="1"
                    title="Products in the bundle"
                    text="Two to four products that sell well together. The bundle shows on each of their pages."
                  />
                  <div className={styles.slots} aria-label={productsHint}>
                    {Array.from({ length: MAX_PRODUCTS }, (_, i) => (
                      <span
                        key={i}
                        className={`${styles.slot} ${
                          i < items.length ? styles.slotFilled : ""
                        }`}
                      />
                    ))}
                    <span>{productsHint}</span>
                  </div>
                </InlineStack>

                {items.length === 0 ? (
                  <div className={styles.dropzone}>
                    <p className={styles.dropzoneTitle}>No products yet</p>
                    <span>
                      Choose from your catalog. Each product is added as its
                      default variant.
                    </span>
                    <Button variant="primary" onClick={pickProducts}>
                      Select products
                    </Button>
                  </div>
                ) : (
                  <BlockStack gap="300">
                    <div className={styles.productList}>
                      {items.map((item) => (
                        <div key={item.productId} className={styles.productRow}>
                          {item.imageUrl ? (
                            <img
                              className={styles.productThumb}
                              src={item.imageUrl}
                              alt={item.productTitle}
                            />
                          ) : (
                            <span className={`${styles.productThumb} ${styles.thumbEmpty}`}>
                              <ImageIcon width={18} height={18} />
                            </span>
                          )}
                          <div className={styles.productBody}>
                            <span className={styles.productTitle}>
                              {item.productTitle}
                            </span>
                            {item.variantTitle ? (
                              <span className={styles.productMeta}>
                                {item.variantTitle}
                              </span>
                            ) : null}
                          </div>
                          <div className={styles.productPrice}>
                            {percentValid ? (
                              <>
                                <span className={styles.productPriceWas}>
                                  {money(item.price)}
                                </span>
                                <span className={styles.productPriceNow}>
                                  {money(applyPercentDiscount(item.price, percent))}
                                </span>
                              </>
                            ) : (
                              <span className={styles.productPriceNow}>
                                {money(item.price)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="tertiary"
                            icon={DeleteIcon}
                            accessibilityLabel={`Remove ${item.productTitle}`}
                            onClick={() => removeItem(item.productId)}
                          />
                        </div>
                      ))}
                    </div>
                    <InlineStack gap="300" blockAlign="center">
                      <Button onClick={pickProducts}>Change products</Button>
                      {items.length < MIN_PRODUCTS ? (
                        <Text as="span" tone="critical" variant="bodySm">
                          A bundle needs at least {MIN_PRODUCTS} products.
                        </Text>
                      ) : null}
                    </InlineStack>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            {/* 2 · Discount */}
            <Card>
              <BlockStack gap="400">
                <SectionHead
                  number="2"
                  title="Bundle discount"
                  text="A percentage off the combined price of the products."
                />
                <InlineGrid columns={{ xs: 1, sm: "1fr 2fr" }} gap="400" alignItems="start">
                  <TextField
                    label="Percent off"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={99}
                    value={discountPercent}
                    onChange={setDiscountPercent}
                    autoComplete="off"
                    suffix="%"
                    placeholder="15"
                    error={
                      discountPercent !== "" && !percentValid
                        ? "Enter a percentage between 1 and 99"
                        : undefined
                    }
                  />
                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Quick picks
                    </Text>
                    <div className={styles.chips}>
                      {DISCOUNT_PICKS.map((pick) => (
                        <button
                          key={pick}
                          type="button"
                          className={`${styles.chip} ${
                            percent === pick ? styles.chipSelected : ""
                          }`}
                          onClick={() => setDiscountPercent(String(pick))}
                        >
                          {pick}%
                        </button>
                      ))}
                    </div>
                  </BlockStack>
                </InlineGrid>
                {items.length > 0 && percentValid ? (
                  <div className={styles.savings}>
                    <span>Shoppers pay</span>
                    <span className={styles.savingsStrong}>
                      {money(pricing.finalTotal)}
                    </span>
                    <span>
                      instead of {money(pricing.originalTotal)}, saving{" "}
                      {money(pricing.discountAmount)}.
                    </span>
                  </div>
                ) : null}
              </BlockStack>
            </Card>

            {/* 3 · Storefront text */}
            <Card>
              <BlockStack gap="400">
                <SectionHead
                  number="3"
                  title="What shoppers see"
                  text="The heading and optional subtitle of the bundle block on your product pages."
                />
                <TextField
                  label="Heading"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  placeholder="Frequently bought together"
                  error={title.trim() ? undefined : "Enter a heading"}
                />
                <TextField
                  label="Subtitle"
                  value={description}
                  onChange={setDescription}
                  autoComplete="off"
                  multiline={2}
                  maxLength={1000}
                  placeholder="Complete the look and save 15%"
                  helpText="Optional. Shown under the heading."
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <div className={styles.statusRow}>
                <BlockStack gap="050">
                  <Text as="h2" variant="headingSm">
                    Status
                  </Text>
                  {status === "ACTIVE" ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge>Inactive</Badge>
                  )}
                </BlockStack>
                <ButtonGroup variant="segmented">
                  <Button
                    pressed={status === "ACTIVE"}
                    onClick={() => setStatus("ACTIVE")}
                  >
                    Active
                  </Button>
                  <Button
                    pressed={status === "INACTIVE"}
                    onClick={() => setStatus("INACTIVE")}
                  >
                    Inactive
                  </Button>
                </ButtonGroup>
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  Only active bundles appear on your storefront.
                </Text>
              </div>
            </Card>

            <div className={styles.previewWrap}>
              <p className={styles.previewEyebrow}>Storefront preview</p>
              <BundlePreview
                title={title}
                description={description}
                discountPercent={percentValid ? percent : 0}
                items={items}
              />
              <p className={styles.previewHint}>
                This is the app block as it renders on the product page of
                every product in the bundle.
              </p>
            </div>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <PageActions
            primaryAction={{
              content: isNew ? "Create bundle" : "Save changes",
              onAction: handleSave,
              disabled: !canSave,
              loading: saving,
            }}
            secondaryActions={[{ content: "Cancel", onAction: back }]}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

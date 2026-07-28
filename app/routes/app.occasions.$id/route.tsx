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
  EmptyState,
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
import { loader } from "./loader";
import { action } from "./action";

export { loader, action };

const MAX_PRODUCTS = 12;

const MONTH_OPTIONS = [
  { label: "—", value: "" },
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

type ProductState = {
  productId: string;
  variantId: string;
  title: string;
  price: number;
  imageUrl: string | null;
};

type PickedProduct = {
  id: string;
  title?: string;
  images?: Array<{ originalSrc?: string; src?: string }>;
  variants?: Array<{ id?: string; title?: string; price?: string }>;
};

export default function OccasionEditor() {
  const loaderData = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const isNew = params.id === "new";
  const occasion = loaderData?.payload?.occasion ?? null;
  const notFound = !isNew && loaderData?.code === "not_found";

  const [name, setName] = useState(occasion?.name ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    occasion?.status ?? "ACTIVE",
  );
  const [startMonth, setStartMonth] = useState(
    occasion?.startMonth ? String(occasion.startMonth) : "",
  );
  const [startDay, setStartDay] = useState(
    occasion?.startDay ? String(occasion.startDay) : "",
  );
  const [endMonth, setEndMonth] = useState(
    occasion?.endMonth ? String(occasion.endMonth) : "",
  );
  const [endDay, setEndDay] = useState(
    occasion?.endDay ? String(occasion.endDay) : "",
  );
  const [products, setProducts] = useState<ProductState[]>(
    occasion?.products.map((product) => ({
      productId: product.productId,
      variantId: product.variantId,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
    })) ?? [],
  );

  const saving = fetcher.state !== "idle";
  const actionData = fetcher.data as
    | { code: string; errors: Array<{ message: string }> | null }
    | undefined;

  useEffect(() => {
    if (actionData?.code === "saved") {
      shopify.toast.show("Occasion saved");
      navigate("/app/occasions");
    }
  }, [actionData, navigate, shopify]);

  const pickProducts = async () => {
    const selected = (await shopify.resourcePicker({
      type: "product",
      multiple: MAX_PRODUCTS,
      selectionIds: products.map((product) => ({ id: product.productId })),
      filter: { variants: false },
    })) as PickedProduct[] | undefined;

    if (!selected) return;

    const next: ProductState[] = [];
    for (const product of selected) {
      const variant = product.variants?.[0];
      if (!variant?.id) continue;
      if (next.some((item) => item.productId === product.id)) continue;
      next.push({
        productId: product.id,
        variantId: variant.id,
        title: product.title || "Untitled product",
        price: parseFloat(variant.price ?? "") || 0,
        imageUrl:
          product.images?.[0]?.originalSrc || product.images?.[0]?.src || null,
      });
    }
    setProducts(next.slice(0, MAX_PRODUCTS));
  };

  const save = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          id: occasion?.id ?? null,
          name,
          status,
          startMonth: startMonth ? Number(startMonth) : null,
          startDay: startDay ? Number(startDay) : null,
          endMonth: endMonth ? Number(endMonth) : null,
          endDay: endDay ? Number(endDay) : null,
          products,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
  };

  if (notFound) {
    return (
      <Page
        title="Occasion"
        backAction={{ onAction: () => navigate("/app/occasions") }}
      >
        <Banner tone="critical" title="This occasion no longer exists" />
      </Page>
    );
  }

  return (
    <Page
      title={isNew ? "Create occasion" : (occasion?.name ?? "Occasion")}
      backAction={{ onAction: () => navigate("/app/occasions") }}
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
                  Details
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                  <TextField
                    label="Name"
                    autoComplete="off"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Mother's Day"
                  />
                  <Select
                    label="Status"
                    options={[
                      { label: "Active", value: "ACTIVE" },
                      { label: "Inactive", value: "INACTIVE" },
                    ]}
                    value={status}
                    onChange={(value) =>
                      setStatus(value === "ACTIVE" ? "ACTIVE" : "INACTIVE")
                    }
                  />
                </InlineGrid>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Season window
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    The occasion is suggested to shoppers during this window
                    each year. Leave empty for occasions that are always
                    relevant, like birthdays.
                  </Text>
                </BlockStack>
                <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
                  <Select
                    label="From month"
                    options={MONTH_OPTIONS}
                    value={startMonth}
                    onChange={setStartMonth}
                  />
                  <TextField
                    label="From day"
                    autoComplete="off"
                    type="number"
                    min={1}
                    max={31}
                    value={startDay}
                    onChange={setStartDay}
                    disabled={!startMonth}
                  />
                  <Select
                    label="To month"
                    options={MONTH_OPTIONS}
                    value={endMonth}
                    onChange={setEndMonth}
                  />
                  <TextField
                    label="To day"
                    autoComplete="off"
                    type="number"
                    min={1}
                    max={31}
                    value={endDay}
                    onChange={setEndDay}
                    disabled={!endMonth}
                  />
                </InlineGrid>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Curated products
                    </Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      Recommended first for this occasion. Products tagged
                      q8:occasion:{occasion?.slug ?? "…"} are included
                      automatically.
                    </Text>
                  </BlockStack>
                  <Button onClick={pickProducts}>
                    {products.length ? "Edit products" : "Add products"}
                  </Button>
                </InlineStack>

                {products.length === 0 ? (
                  <EmptyState
                    heading="No products curated yet"
                    action={{ content: "Add products", onAction: pickProducts }}
                    image=""
                  >
                    <p>
                      Pick up to {MAX_PRODUCTS} products to feature for this
                      occasion.
                    </p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="200">
                    {products.map((product) => (
                      <InlineStack
                        key={product.productId}
                        align="space-between"
                        blockAlign="center"
                        gap="200"
                        wrap={false}
                      >
                        <InlineStack gap="300" blockAlign="center" wrap={false}>
                          <Thumbnail
                            source={product.imageUrl ?? ""}
                            alt={product.title}
                            size="small"
                          />
                          <Text as="span" variant="bodyMd">
                            {product.title}
                          </Text>
                        </InlineStack>
                        <InlineStack gap="300" blockAlign="center" wrap={false}>
                          <Text as="span" tone="subdued" numeric>
                            ${product.price.toFixed(2)}
                          </Text>
                          <Button
                            icon={DeleteIcon}
                            variant="tertiary"
                            accessibilityLabel="Remove product"
                            onClick={() =>
                              setProducts((current) =>
                                current.filter(
                                  (item) => item.productId !== product.productId,
                                ),
                              )
                            }
                          />
                        </InlineStack>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <PageActions
              primaryAction={{
                content: isNew ? "Create occasion" : "Save changes",
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

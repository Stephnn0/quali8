import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineGrid,
  InlineStack,
  Layout,
  List,
  Page,
  PageActions,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FeatureHeader } from "app/components/OneApp";
import { loader, type CarrierPageData } from "./loader";
import { action } from "./action";

export { loader, action };

/**
 * Delivery Rates: the app's carrier service. Shows whether Shopify accepted
 * the registration, and the one rate returned at checkout, priced by the
 * delivery zones managed on the Announcements + Delivery Check page.
 */
export default function DeliveryRatesPage() {
  const loaderData = useLoaderData<typeof loader>();
  const data = loaderData?.payload as CarrierPageData | undefined;
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher<{ code: string; errors: Array<{ message: string }> | null }>();

  const [enabled, setEnabled] = useState(data?.rate.enabled ?? true);
  const [title, setTitle] = useState(data?.rate.title ?? "Local delivery");
  const [fallbackPrice, setFallbackPrice] = useState(
    data?.rate.fallbackPrice === null || data?.rate.fallbackPrice === undefined
      ? ""
      : String(data.rate.fallbackPrice),
  );

  const saving = fetcher.state !== "idle";
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.code === "saved") {
      shopify.toast.show("Delivery rate saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () => {
    const price = fallbackPrice.trim() === "" ? null : Number.parseFloat(fallbackPrice);
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "save",
          enabled,
          title,
          fallbackPrice: price !== null && Number.isFinite(price) ? price : null,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
  };

  const status = data?.status;
  const statusBanner = (() => {
    if (!status) return null;
    switch (status.state) {
      case "registered":
        return (
          <Banner tone="success" title="Carrier service registered">
            <p>
              Shopify will ask this app for delivery rates at checkout. Rates are
              priced by your delivery zones.
            </p>
          </Banner>
        );
      case "scope-missing":
        return (
          <Banner tone="warning" title="The app needs the write_shipping permission">
            <p>
              Reinstall or re-authorize the app after the permission is added to the
              app configuration. Shopify said: {status.message}
            </p>
          </Banner>
        );
      case "unsupported":
        return (
          <Banner tone="critical" title="Your Shopify plan doesn't allow third-party delivery rates">
            <p>
              Carrier-calculated shipping is included on Advanced and Plus, and on
              any plan billed annually. Shopify said: {status.message}
            </p>
          </Banner>
        );
      default:
        return (
          <Banner tone="critical" title="Couldn't register the carrier service">
            <p>{status.message}</p>
          </Banner>
        );
    }
  })();

  return (
    <Page>
      <FeatureHeader
        featureKey="delivery-rates"
        tagline="One delivery rate at checkout, priced by the zip code zones you set. Shopify asks this app for the rate every time a shopper enters an address."
      />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {statusBanner}
            {fetcher.data?.errors?.length ? (
              <Banner tone="critical" title={fetcher.data.errors[0].message} />
            ) : null}

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Delivery rate
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Shown as a shipping method at checkout. Each zone's price applies
                    to its codes; a zone without a price returns no rate.
                  </Text>
                </BlockStack>
                <Checkbox
                  label="Return rates at checkout"
                  checked={enabled}
                  onChange={setEnabled}
                />
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                  <TextField
                    label="Rate name"
                    autoComplete="off"
                    value={title}
                    onChange={setTitle}
                    placeholder="Local delivery"
                    maxLength={60}
                  />
                  <TextField
                    label="Price outside your zones"
                    type="number"
                    min={0}
                    autoComplete="off"
                    value={fallbackPrice}
                    onChange={setFallbackPrice}
                    prefix="$"
                    placeholder="No delivery"
                    helpText="Leave empty to offer no delivery outside your zones."
                  />
                </InlineGrid>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Delivery zones
                  </Text>
                  <Button onClick={() => navigate("/app/features/smart-announcements")}>
                    Manage zones
                  </Button>
                </InlineStack>
                <InlineStack gap="200">
                  <Badge>{`${data?.zones.total ?? 0} zones`}</Badge>
                  <Badge tone="success">{`${data?.zones.active ?? 0} active`}</Badge>
                  <Badge tone="info">{`${data?.zones.priced ?? 0} with a price`}</Badge>
                  <Badge tone={data?.deliveryCheckEnabled ? "success" : "attention"}>
                    {data?.deliveryCheckEnabled ? "Zip checker on" : "Zip checker off"}
                  </Badge>
                </InlineStack>
                <Text as="p" tone="subdued" variant="bodySm">
                  Zones live on the Announcements + Delivery Check page so the storefront
                  zip checker, the cart delivery gate, and checkout rates always agree.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  How it works
                </Text>
                <List type="bullet">
                  <List.Item>
                    At checkout, Shopify sends the shopper&rsquo;s postal code to this
                    app and shows the rate it returns as a shipping method.
                  </List.Item>
                  <List.Item>
                    A matching zone&rsquo;s price wins; otherwise the price outside your
                    zones applies; otherwise no delivery is offered for that address.
                  </List.Item>
                  <List.Item>
                    Add the &ldquo;Delivery checkout&rdquo; block to your cart page so
                    shoppers check their zip and fill in their address before checkout.
                  </List.Item>
                </List>
              </BlockStack>
            </Card>

            <PageActions
              primaryAction={{
                content: "Save",
                onAction: save,
                loading: saving,
                disabled: saving || title.trim().length === 0,
              }}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

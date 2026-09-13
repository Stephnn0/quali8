import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
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
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FeatureHeader } from "app/components/OneApp";
import DeliveryZonesEditor from "app/components/Delivery/DeliveryZonesEditor";
import DeliveryScheduleEditor from "app/components/Delivery/DeliveryScheduleEditor";
import TodayDeliveryEditor from "app/components/Delivery/TodayDeliveryEditor";
import TimedDeliveryEditor from "app/components/Delivery/TimedDeliveryEditor";
import CartOptionsEditor from "app/components/Delivery/CartOptionsEditor";
import { defaultCartOptions } from "app/services/delivery/cartOptions";
import { defaultDeliverySchedule } from "app/services/delivery/deliverySchedule";
import { DEFAULT_RATE_TITLE } from "app/services/carrier/rates";
import { loader, type DeliveryPageData } from "./loader";
import { action } from "./action";

export { loader, action };

type ActionResult = {
  code: string;
  errors: Array<{ message: string }> | null;
};

/**
 * Delivery: one page for everything about where and how the shop delivers.
 * Zones and the zip checker feed the header bar and the cart gate; the
 * carrier service returns the zone's price as the shipping rate at checkout.
 */
export default function DeliveryPage() {
  const loaderData = useLoaderData<typeof loader>();
  const data = loaderData?.payload as DeliveryPageData | undefined;
  const shopify = useAppBridge();

  const carrierFetcher = useFetcher<ActionResult>();
  const filterFetcher = useFetcher<ActionResult>();
  const rateFetcher = useFetcher<ActionResult>();

  const [enabled, setEnabled] = useState(data?.rate.enabled ?? true);
  const [title, setTitle] = useState(data?.rate.title ?? DEFAULT_RATE_TITLE);
  const [fallbackPrice, setFallbackPrice] = useState(
    data?.rate.fallbackPrice === null || data?.rate.fallbackPrice === undefined
      ? ""
      : String(data.rate.fallbackPrice),
  );

  useEffect(() => {
    if (rateFetcher.state === "idle" && rateFetcher.data?.code === "rate-saved") {
      shopify.toast.show("Checkout rate saved");
    }
  }, [rateFetcher.state, rateFetcher.data, shopify]);

  useEffect(() => {
    if (carrierFetcher.state !== "idle" || !carrierFetcher.data) return;
    if (carrierFetcher.data.code === "carrier-installed") {
      shopify.toast.show("Carrier service installed");
    }
  }, [carrierFetcher.state, carrierFetcher.data, shopify]);

  const installCarrier = () =>
    carrierFetcher.submit(
      { body: JSON.stringify({ action: "install-carrier" }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  useEffect(() => {
    if (filterFetcher.state === "idle" && filterFetcher.data?.code === "method-filter-installed") {
      shopify.toast.show("Checkout will follow the cart's delivery method");
    }
  }, [filterFetcher.state, filterFetcher.data, shopify]);

  const installFilter = () =>
    filterFetcher.submit(
      { body: JSON.stringify({ action: "install-method-filter" }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  const methodFilter = data?.methodFilter;
  const filterError =
    filterFetcher.state === "idle" && filterFetcher.data?.code === "method-filter-failed"
      ? filterFetcher.data.errors?.[0]?.message
      : null;
  const filterStatus = (() => {
    if (!methodFilter) return null;
    switch (methodFilter.state) {
      case "installed":
        return {
          badge: <Badge tone="success">Active</Badge>,
          text: "Checkout only offers the method the shopper picked in the cart: shipping for Delivery, local pickup for Pickup.",
          button: null,
        };
      case "disabled":
        return {
          badge: <Badge tone="attention">Turned off</Badge>,
          text: "The customization exists but is switched off in Settings → Shipping and delivery. Turn it back on here.",
          button: "Turn on",
        };
      case "missing":
        return {
          badge: <Badge tone="critical">Not active</Badge>,
          text: "Checkout still shows both Ship and Pickup. Activate the customization so it follows the cart.",
          button: "Activate",
        };
      case "not-deployed":
        return {
          badge: <Badge tone="critical">Not deployed</Badge>,
          text: "The delivery method function isn't in the app version installed on this shop yet. Deploy the app, then come back.",
          button: null,
        };
      case "scope-missing":
        return {
          badge: <Badge tone="critical">Permission missing</Badge>,
          text: "The app needs the write_delivery_customizations permission. Deploy the new configuration, reopen the app and accept it.",
          button: "Try again",
        };
      default:
        return {
          badge: <Badge tone="critical">Error</Badge>,
          text: methodFilter.message,
          button: "Try again",
        };
    }
  })();

  const saveRate = () => {
    const price = fallbackPrice.trim() === "" ? null : Number.parseFloat(fallbackPrice);
    rateFetcher.submit(
      {
        body: JSON.stringify({
          action: "save-rate",
          enabled,
          title,
          fallbackPrice: price !== null && Number.isFinite(price) ? price : null,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
  };

  const carrier = data?.carrier;
  const installing = carrierFetcher.state !== "idle";
  const installError =
    carrierFetcher.state === "idle" && carrierFetcher.data?.code === "carrier-failed"
      ? carrierFetcher.data.errors?.[0]?.message
      : null;

  const carrierStatus = (() => {
    if (!carrier) return null;
    switch (carrier.state) {
      case "installed":
        return {
          badge: <Badge tone="success">Installed</Badge>,
          text: "Shopify asks this app for a delivery rate every time a shopper enters an address at checkout.",
          detail: carrier.callbackUrl,
          button: null,
        };
      case "stale":
        return {
          badge: <Badge tone="attention">Needs update</Badge>,
          text: "The carrier service exists but points somewhere else or is inactive. Reinstall to point it at this app.",
          detail: `Registered: ${carrier.registeredUrl ?? "none"} · Expected: ${carrier.callbackUrl}`,
          button: "Reinstall carrier service",
        };
      case "missing":
        return {
          badge: <Badge tone="critical">Not installed</Badge>,
          text: "Shopify is not asking this app for delivery rates yet. Install the carrier service to turn on checkout rates.",
          detail: carrier.callbackUrl,
          button: "Install carrier service",
        };
      case "scope-missing":
        return {
          badge: <Badge tone="critical">Permission missing</Badge>,
          text: "The app needs the write_shipping permission. Add it to the app configuration, redeploy, then reopen the app and accept the new permission.",
          detail: carrier.message,
          button: "Try again",
        };
      default:
        return {
          badge: <Badge tone="critical">Error</Badge>,
          text: "Could not read the shop's carrier services.",
          detail: carrier.message,
          button: "Try again",
        };
    }
  })();

  return (
    <Page>
      <FeatureHeader
        featureKey="delivery"
        tagline="Zip codes you deliver to, what it costs, and how shoppers check it. The header bar, the cart gate, and checkout rates all read from here."
      />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center" gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Carrier service
                    </Text>
                    {carrierStatus?.badge}
                  </InlineStack>
                  {carrierStatus?.button ? (
                    <Button variant="primary" onClick={installCarrier} loading={installing}>
                      {carrierStatus.button}
                    </Button>
                  ) : null}
                </InlineStack>
                <Text as="p" tone="subdued">
                  {carrierStatus?.text}
                </Text>
                {carrierStatus?.detail ? (
                  <Text as="p" variant="bodySm" tone="subdued" breakWord>
                    {carrierStatus.detail}
                  </Text>
                ) : null}
                {installError ? (
                  <Banner tone="critical" title="Shopify refused the carrier service">
                    <p>{installError}</p>
                    <p>
                      Third-party carrier rates need the write_shipping permission and a
                      Shopify plan with carrier-calculated shipping: Advanced, Plus, or any
                      plan billed annually (ask Shopify support to enable it).
                    </p>
                  </Banner>
                ) : null}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center" gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Checkout delivery method
                    </Text>
                    {filterStatus?.badge}
                  </InlineStack>
                  {filterStatus?.button ? (
                    <Button variant="primary" onClick={installFilter} loading={filterFetcher.state !== "idle"}>
                      {filterStatus.button}
                    </Button>
                  ) : null}
                </InlineStack>
                <Text as="p" tone="subdued">
                  {filterStatus?.text ??
                    "Makes checkout follow what the shopper chose in the cart, so nobody picks Pickup in the cart and Ship at checkout."}
                </Text>
                {filterError ? (
                  <Banner tone="critical" title="Shopify refused the customization">
                    <p>{filterError}</p>
                  </Banner>
                ) : null}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Delivery zones & zip checker
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    A zone is a list of zip or postal codes with an optional price and
                    message. Zones are matched top to bottom. The switch shows the zip
                    checker in the header bar and turns on the cart delivery gate.
                  </Text>
                </BlockStack>
                <DeliveryZonesEditor
                  enabled={data?.delivery.enabled ?? false}
                  zones={data?.delivery.zones ?? []}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Delivery & pickup calendar
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Which days shoppers can choose for delivery or pickup. Block whole
                    weekdays, single dates, and set how far ahead they can book.
                  </Text>
                </BlockStack>
                <DeliveryScheduleEditor
                  key={JSON.stringify(data?.schedule ?? null)}
                  schedule={data?.schedule ?? defaultDeliverySchedule()}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Checkout rate
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    The shipping method shown at checkout. Inside a zone the rate carries
                    the zone&rsquo;s name and price, plus &ldquo;+ Timed delivery&rdquo;
                    when the shopper picked a window. A zone without a price returns no
                    rate for its codes.
                  </Text>
                </BlockStack>
                <Checkbox
                  label="Return rates at checkout"
                  checked={enabled}
                  onChange={setEnabled}
                />
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                  <TextField
                    label="Rate name outside your zones"
                    autoComplete="off"
                    value={title}
                    onChange={setTitle}
                    placeholder={DEFAULT_RATE_TITLE}
                    maxLength={60}
                    helpText="Only used with the price below. In a zone, the zone's name is the rate."
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
                <InlineStack>
                  <Button
                    variant="primary"
                    onClick={saveRate}
                    loading={rateFetcher.state !== "idle"}
                    disabled={title.trim().length === 0}
                  >
                    Save checkout rate
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Today delivery
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Whether shoppers can still pick today, and until what time. Judged
                    on the shop&rsquo;s clock, not the shopper&rsquo;s. Once closed, the
                    cart calendar greys out today and says so.
                  </Text>
                </BlockStack>
                <TodayDeliveryEditor
                  key={JSON.stringify([data?.schedule.delivery.todayCutoff, data?.schedule.pickup.todayCutoff])}
                  clock={data?.clock ?? null}
                  delivery={data?.schedule.delivery ?? defaultDeliverySchedule().delivery}
                  pickup={data?.schedule.pickup ?? defaultDeliverySchedule().pickup}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Timed delivery
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Windows shoppers can add to a delivery for an extra charge: before,
                    after, or by a time. The cart shows them under the calendar; checkout
                    charges the zone price plus the window.
                  </Text>
                </BlockStack>
                <TimedDeliveryEditor
                  key={JSON.stringify(data?.timeWindows ?? [])}
                  windows={data?.timeWindows ?? []}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Options step
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    The cart&rsquo;s third step: occasion (with that occasion&rsquo;s
                    products to add), card message, notes, and what to do if nobody
                    answers the door. Switch the step off to go straight to Review.
                  </Text>
                </BlockStack>
                <CartOptionsEditor
                  key={JSON.stringify(data?.cartOptions ?? null)}
                  options={data?.cartOptions ?? defaultCartOptions()}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Storefront setup
                </Text>
                <Text as="p" tone="subdued">
                  Two theme pieces show delivery to shoppers. Both are in the theme
                  editor under Online Store &rarr; Themes &rarr; Customize.
                </Text>
                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      1. Cart page: Delivery checkout
                    </Text>
                    <List type="number">
                      <List.Item>Open the Cart template.</List.Item>
                      <List.Item>
                        Add block &rarr; Apps &rarr; <strong>Delivery checkout</strong>.
                      </List.Item>
                      <List.Item>
                        Shoppers check their zip, pick a date, fill in their address, add
                        a card message and extras, and continue to a prefilled checkout.
                        The theme&rsquo;s own checkout buttons stay hidden until delivery
                        is confirmed.
                      </List.Item>
                    </List>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      2. Every page: zip checker in the header bar
                    </Text>
                    <List type="number">
                      <List.Item>Open Theme settings &rarr; App embeds.</List.Item>
                      <List.Item>
                        Turn on <strong>Announcement + delivery</strong>.
                      </List.Item>
                      <List.Item>
                        The bar shows the zip checker on every page whenever the switch
                        above is on, with or without a scheduled announcement.
                      </List.Item>
                    </List>
                  </BlockStack>
                </InlineGrid>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);

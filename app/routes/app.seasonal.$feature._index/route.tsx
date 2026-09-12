import { useCallback, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  InlineGrid,
  Layout,
  Modal,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { FeatureHeader } from "app/components/OneApp";
import {
  SEASONAL_FEATURES,
  isSeasonalFeatureKey,
  seasonalFeaturePath,
} from "app/components/Seasonal/seasonalFeatures";
import { daysAway, prettyDate } from "app/components/Seasonal/dates";
import { loadFeatureDates } from "app/services/seasonal/featureDates.server";
import emptyImage from "app/assets/customer-segment-icon.png";

/**
 * A standalone seasonal feature: the list of upcoming sales dates with this
 * feature's state on each. Opening a date goes to the per-date config page.
 * Dates come from the assistant's brief; merchants can also add their own.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  const featureKey = params.feature;
  if (!isSeasonalFeatureKey(featureKey)) {
    throw new Response("Feature not found", { status: 404 });
  }

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const dates = await loadFeatureDates(db, session.shop, featureKey);
  return { featureKey, dates };
}

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().trim().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  whyItMatters: z.string().trim().max(200).optional(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  if (!isSeasonalFeatureKey(params.feature)) {
    throw new Response("Feature not found", { status: 404 });
  }

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = createSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    const created = await db.specialDate.upsert({
      where: {
        shop_name_date: {
          shop: session.shop,
          name: body.name,
          date: body.date,
        },
      },
      create: {
        shop: session.shop,
        name: body.name,
        date: body.date,
        whyItMatters: body.whyItMatters || null,
        source: "MERCHANT",
      },
      update: { whyItMatters: body.whyItMatters || null, archived: false },
      select: { id: true },
    });
    return { code: "created", id: created.id, errors: null };
  } catch (error) {
    console.error("Seasonal feature date action error:", error);
    return {
      code: "error",
      id: null,
      errors: [{ message: "Something went wrong. Try again." }],
    };
  }
}

export default function SeasonalFeatureIndex() {
  const { featureKey, dates } = useLoaderData<typeof loader>();
  const feature = SEASONAL_FEATURES[featureKey];
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [why, setWhy] = useState("");

  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const create = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "create",
          name,
          date,
          whyItMatters: why || undefined,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Date added");
    setCreateOpen(false);
    setName("");
    setDate("");
    setWhy("");
  };

  const rows = dates.map((entry, index) => (
    <IndexTable.Row
      id={String(entry.id)}
      key={entry.id}
      position={index}
      onClick={() => navigate(seasonalFeaturePath(featureKey, entry.id))}
    >
      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text as="span" variant="bodyMd" fontWeight="bold">
            {entry.name}
          </Text>
          {entry.whyItMatters ? (
            <Text as="span" variant="bodySm" tone="subdued">
              {entry.whyItMatters}
            </Text>
          ) : null}
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text as="span" numeric>
            {prettyDate(entry.date)}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {daysAway(entry.date) === 0
              ? "Today"
              : `In ${daysAway(entry.date)} days`}
          </Text>
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={entry.active ? "success" : undefined}>{entry.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          onClick={() => navigate(seasonalFeaturePath(featureKey, entry.id))}
        >
          {entry.configured ? feature.editLabel : feature.setupLabel}
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <FeatureHeader
        featureKey={featureKey}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Add a date
          </Button>
        }
      />
      <Layout>
        <Layout.Section>
          {dates.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "date", plural: "dates" }}
                itemCount={dates.length}
                selectable={false}
                headings={[
                  { title: "Sales date" },
                  { title: "Date" },
                  { title: feature.statusHeading },
                  { title: "" },
                ]}
              >
                {rows}
              </IndexTable>
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="No upcoming sales dates"
                action={{
                  content: "Add a date",
                  onAction: () => setCreateOpen(true),
                }}
                image={emptyImage}
              >
                <p>
                  Your assistant adds sales dates automatically when it
                  generates a brief. Add your own, like a launch or a local
                  event, to set up {feature.configTitle.toLowerCase()} for it.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Add a sales date"
        primaryAction={{
          content: "Add date",
          onAction: create,
          disabled: !name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date),
        }}
        secondaryActions={[{ content: "Cancel", onAction: closeCreate }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <TextField
                label="Name"
                autoComplete="off"
                value={name}
                onChange={setName}
                placeholder="e.g. Grand reopening"
              />
              <TextField
                label="Date"
                type="date"
                autoComplete="off"
                value={date}
                onChange={setDate}
              />
            </InlineGrid>
            <TextField
              label="Why it matters (optional)"
              autoComplete="off"
              value={why}
              onChange={setWhy}
              placeholder="One line your future self will thank you for"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);

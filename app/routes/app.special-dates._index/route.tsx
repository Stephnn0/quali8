import { useCallback, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  ButtonGroup,
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
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { FeatureHeader } from "app/components/OneApp";
import { getUpcomingSpecialDates } from "app/services/assistant/specialDates.server";
import emptyImage from "app/assets/customer-segment-icon.png";

export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const dates = await getUpcomingSpecialDates(db, session.shop);
  return {
    dates: dates.map((entry) => ({
      id: entry.id,
      name: entry.name,
      date: entry.date,
      source: entry.source,
      whyItMatters: entry.whyItMatters,
      todoCount: entry._count.todos,
      todoDone: entry.todos.filter((todo) => todo.done).length,
    })),
  };
}

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().trim().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  whyItMatters: z.string().trim().max(200).optional(),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.number().int().positive(),
});

const bodySchema = z.discriminatedUnion("action", [createSchema, deleteSchema]);

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    if (body.action === "create") {
      await db.specialDate.upsert({
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
      });
      return { code: "created", errors: null };
    }

    // delete — shop-scoped
    await db.specialDate.deleteMany({
      where: { id: body.id, shop: session.shop },
    });
    return { code: "deleted", errors: null };
  } catch (error) {
    console.error("Special dates action error:", error);
    return {
      code: "error",
      errors: [{ message: "Something went wrong. Try again." }],
    };
  }
}

function daysAway(isoDate: string): number {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(
    0,
    Math.round((Date.parse(isoDate + "T00:00:00Z") - today) / 86_400_000),
  );
}

const prettyDate = (isoDate: string) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default function SpecialDatesIndex() {
  const { dates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [why, setWhy] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

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
    shopify.toast.show("Special date added");
    setCreateOpen(false);
    setName("");
    setDate("");
    setWhy("");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    fetcher.submit(
      { body: JSON.stringify({ action: "delete", id: deleteTarget.id }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Special date removed");
    setDeleteTarget(null);
  };

  const rows = dates.map((entry, index) => (
    <IndexTable.Row id={String(entry.id)} key={entry.id} position={index}>
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
        <Badge tone={entry.source === "AI" ? "info" : undefined}>
          {entry.source === "AI" ? "Assistant" : "Yours"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {entry.todoCount > 0
            ? `${entry.todoDone}/${entry.todoCount}`
            : "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            icon={EditIcon}
            onClick={() => navigate(`/app/special-dates/${entry.id}`)}
          >
            Manage
          </Button>
          <Button
            icon={DeleteIcon}
            accessibilityLabel="Remove special date"
            onClick={() => setDeleteTarget({ id: entry.id, name: entry.name })}
          />
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <FeatureHeader
        featureKey="sales-calendar"
        tagline="Every date that can drive revenue for your shop — each with its own announcements, popups, SEO, and prep plan. Smart Announcements, SEO AI, and Subscribe Boost launch from here."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Add special date
          </Button>
        }
      />
      <Layout>
        <Layout.Section>
          {dates.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "special date", plural: "special dates" }}
                itemCount={dates.length}
                selectable={false}
                headings={[
                  { title: "Occasion" },
                  { title: "Date" },
                  { title: "Source" },
                  { title: "To-dos" },
                  { title: "Actions" },
                ]}
              >
                {rows}
              </IndexTable>
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="No special dates yet"
                action={{
                  content: "Add special date",
                  onAction: () => setCreateOpen(true),
                }}
                image={emptyImage}
              >
                <p>
                  Your assistant adds dates automatically when it generates a
                  brief — or add your own, like a launch or a local event.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Add a special date"
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

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Remove this special date?"
        primaryAction={{
          content: "Remove",
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setDeleteTarget(null) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            {deleteTarget
              ? `"${deleteTarget.name}" and its to-dos will be removed. Applied SEO changes stay live on your store.`
              : ""}
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

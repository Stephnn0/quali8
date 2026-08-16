import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { BlockStack, Button, Card, EmptyState, Layout, Page, Text } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { generateFaqSuggestions } from "app/services/assistant/collectionFaqs.server";
import emptyImage from "app/assets/customer-segment-icon.png";
import FaqCollectionCard from "./components/FaqCollectionCard";
import { FeatureHeader } from "app/components/OneApp";

export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const faqs = await db.collectionFaq.findMany({
    where: { shop: session.shop },
    orderBy: [{ collectionTitle: "asc" }, { position: "asc" }, { id: "asc" }],
  });

  // Group by collection for the page
  const byCollection = new Map<
    string,
    { collectionId: string; collectionTitle: string; faqs: typeof faqs }
  >();
  for (const faq of faqs) {
    const group = byCollection.get(faq.collectionId);
    if (group) {
      group.faqs.push(faq);
    } else {
      byCollection.set(faq.collectionId, {
        collectionId: faq.collectionId,
        collectionTitle: faq.collectionTitle,
        faqs: [faq],
      });
    }
  }

  return {
    collections: [...byCollection.values()].map((group) => ({
      collectionId: group.collectionId,
      collectionTitle: group.collectionTitle,
      faqs: group.faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
      })),
    })),
  };
}

const collectionRef = z.object({
  collectionId: z.string().startsWith("gid://shopify/Collection/"),
  collectionTitle: z.string().min(1).max(120),
});

const addSchema = collectionRef.extend({
  action: z.literal("add"),
  question: z.string().trim().min(1).max(160),
  answer: z.string().trim().min(1).max(600),
});
const updateSchema = z.object({
  action: z.literal("update"),
  id: z.number().int().positive(),
  question: z.string().trim().min(1).max(160),
  answer: z.string().trim().min(1).max(600),
});
const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.number().int().positive(),
});
const suggestSchema = collectionRef.extend({
  action: z.literal("suggest"),
});

const bodySchema = z.discriminatedUnion("action", [
  addSchema,
  updateSchema,
  deleteSchema,
  suggestSchema,
]);

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    if (body.action === "add") {
      const last = await db.collectionFaq.findFirst({
        where: { shop: session.shop, collectionId: body.collectionId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await db.collectionFaq.create({
        data: {
          shop: session.shop,
          collectionId: body.collectionId,
          collectionTitle: body.collectionTitle,
          question: body.question,
          answer: body.answer,
          position: (last?.position ?? -1) + 1,
        },
      });
      return { code: "added", errors: null };
    }

    if (body.action === "update") {
      await db.collectionFaq.updateMany({
        where: { id: body.id, shop: session.shop },
        data: { question: body.question, answer: body.answer },
      });
      return { code: "updated", errors: null };
    }

    if (body.action === "delete") {
      await db.collectionFaq.deleteMany({
        where: { id: body.id, shop: session.shop },
      });
      return { code: "deleted", errors: null };
    }

    // suggest — one AI batch, inserted as editable rows
    const [profile, existing, last] = await Promise.all([
      db.storeProfile.findUnique({ where: { shop: session.shop } }),
      db.collectionFaq.findMany({
        where: { shop: session.shop, collectionId: body.collectionId },
        select: { question: true },
      }),
      db.collectionFaq.findFirst({
        where: { shop: session.shop, collectionId: body.collectionId },
        orderBy: { position: "desc" },
        select: { position: true },
      }),
    ]);

    const suggestions = await generateFaqSuggestions(db, session.shop, {
      collectionTitle: body.collectionTitle,
      nicheLabel: profile?.nicheLabel ?? "Shopify",
      country: profile?.country ?? null,
      existingQuestions: existing.map((faq) => faq.question),
    });
    if (!suggestions) {
      return {
        code: "ai-unavailable",
        errors: [{ message: "The AI is unavailable right now — try again shortly" }],
      };
    }

    let position = (last?.position ?? -1) + 1;
    await db.collectionFaq.createMany({
      data: suggestions.map((faq) => ({
        shop: session.shop,
        collectionId: body.collectionId,
        collectionTitle: body.collectionTitle,
        question: faq.question,
        answer: faq.answer,
        position: position++,
      })),
    });
    return { code: "suggested", errors: null };
  } catch (error) {
    console.error("Collection FAQs action error:", error);
    return {
      code: "error",
      errors: [{ message: "Something went wrong. Try again." }],
    };
  }
}

type PickedCollection = { id: string; title?: string };

export default function CollectionFaqsIndex() {
  const { collections } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const pickCollection = async () => {
    const selected = (await shopify.resourcePicker({
      type: "collection",
      multiple: false,
    })) as PickedCollection[] | undefined;
    const collection = selected?.[0];
    if (!collection?.id) return;

    // Start the collection with AI suggestions right away — rows are
    // editable afterwards; failures surface via toast.
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "suggest",
          collectionId: collection.id,
          collectionTitle: collection.title || "Collection",
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    shopify.toast.show("Generating FAQs…");
  };

  return (
    <Page>
      <FeatureHeader
        featureKey="faq-collections"
        tagline="SEO-friendly Q&As below the products on each collection page, with FAQ structured data for search engines."
        actions={
          <Button variant="primary" onClick={pickCollection}>
            Add FAQs to a collection
          </Button>
        }
      />
      <Layout>
        <Layout.Section>
          {collections.length > 0 ? (
            <BlockStack gap="400">
              {collections.map((group) => (
                <FaqCollectionCard key={group.collectionId} group={group} />
              ))}
              <Card>
                <BlockStack gap="200" inlineAlign="start">
                  <Text as="p" tone="subdued" variant="bodySm">
                    Don&rsquo;t forget: add the &ldquo;Collection FAQs&rdquo;
                    block to your collection template once in the theme
                    editor — every collection with questions here will show
                    them automatically.
                  </Text>
                  <Button onClick={pickCollection}>Add another collection</Button>
                </BlockStack>
              </Card>
            </BlockStack>
          ) : (
            <Card>
              <EmptyState
                heading="Answer shoppers before they ask"
                action={{
                  content: "Add FAQs to a collection",
                  onAction: pickCollection,
                }}
                image={emptyImage}
              >
                <p>
                  Pick a collection and we&rsquo;ll draft SEO-friendly
                  questions for it — edit them, add your own, and they render
                  below the products with FAQ structured data.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}

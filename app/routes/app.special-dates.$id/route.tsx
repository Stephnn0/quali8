import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { Badge, BlockStack, InlineStack, Layout, Page, Text } from "@shopify/polaris";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { generateDateTodos } from "app/services/assistant/dateTodos.server";
import TodoBoard from "./components/TodoBoard";
import SeoOptimizer from "./components/SeoOptimizer";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const specialDate = await db.specialDate.findFirst({
    where: { id: Number(params.id), shop: session.shop },
  });
  if (!specialDate) {
    return { specialDate: null, todos: [], seoActions: [] };
  }

  // Lazy AI starter set — once per date, respects later deletions
  if (!specialDate.todosGeneratedAt) {
    const profile = await db.storeProfile.findUnique({
      where: { shop: session.shop },
    });
    await generateDateTodos(
      db,
      session.shop,
      {
        id: specialDate.id,
        name: specialDate.name,
        date: specialDate.date,
        whyItMatters: specialDate.whyItMatters,
      },
      {
        nicheLabel: profile?.nicheLabel ?? "Shopify",
        country: profile?.country ?? null,
      },
    );
  }

  const [todos, seoActions] = await Promise.all([
    db.specialDateTodo.findMany({
      where: { specialDateId: specialDate.id },
      orderBy: [{ kind: "asc" }, { position: "asc" }, { id: "asc" }],
    }),
    db.seoMetaAction.findMany({
      where: { specialDateId: specialDate.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    specialDate: {
      id: specialDate.id,
      name: specialDate.name,
      date: specialDate.date,
      whyItMatters: specialDate.whyItMatters,
      source: specialDate.source,
    },
    todos: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      kind: todo.kind,
      source: todo.source,
      done: todo.done,
    })),
    seoActions: seoActions.map((entry) => ({
      id: entry.id,
      resourceType: entry.resourceType,
      resourceTitle: entry.resourceTitle,
      newSeoTitle: entry.newSeoTitle,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

const addTodoSchema = z.object({
  action: z.literal("add-todo"),
  title: z.string().trim().min(1).max(80),
  kind: z.enum(["SEO", "MARKETING", "GENERAL"]),
});
const toggleTodoSchema = z.object({
  action: z.literal("toggle-todo"),
  id: z.number().int().positive(),
  done: z.boolean(),
});
const deleteTodoSchema = z.object({
  action: z.literal("delete-todo"),
  id: z.number().int().positive(),
});
const bodySchema = z.discriminatedUnion("action", [
  addTodoSchema,
  toggleTodoSchema,
  deleteTodoSchema,
]);

export async function action({ request, params }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const specialDate = await db.specialDate.findFirst({
      where: { id: Number(params.id), shop: session.shop },
      select: { id: true },
    });
    if (!specialDate) return { code: "not-found", errors: null };

    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    if (body.action === "add-todo") {
      await db.specialDateTodo.create({
        data: {
          shop: session.shop,
          specialDateId: specialDate.id,
          title: body.title,
          kind: body.kind,
          source: "MERCHANT",
          position: 999,
        },
      });
      return { code: "todo-added", errors: null };
    }

    if (body.action === "toggle-todo") {
      await db.specialDateTodo.updateMany({
        where: { id: body.id, specialDateId: specialDate.id },
        data: { done: body.done },
      });
      return { code: "todo-updated", errors: null };
    }

    await db.specialDateTodo.deleteMany({
      where: { id: body.id, specialDateId: specialDate.id },
    });
    return { code: "todo-deleted", errors: null };
  } catch (error) {
    console.error("Special date action error:", error);
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

export default function SpecialDateManage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  if (!data.specialDate) {
    return (
      <Page
        title="Special date"
        backAction={{ onAction: () => navigate("/app/special-dates") }}
      >
        <Text as="p">This special date no longer exists.</Text>
      </Page>
    );
  }

  const { specialDate } = data;
  const days = daysAway(specialDate.date);

  return (
    <Page
      title={specialDate.name}
      subtitle={specialDate.whyItMatters ?? undefined}
      backAction={{ onAction: () => navigate("/app/special-dates") }}
      titleMetadata={
        <InlineStack gap="200">
          <Badge tone="attention">
            {days === 0 ? "Today" : `In ${days} days`}
          </Badge>
          <Badge tone={specialDate.source === "AI" ? "info" : undefined}>
            {specialDate.source === "AI" ? "Assistant" : "Yours"}
          </Badge>
        </InlineStack>
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <TodoBoard todos={data.todos} />
            <SeoOptimizer
              specialDateId={specialDate.id}
              specialDateName={specialDate.name}
              appliedActions={data.seoActions}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

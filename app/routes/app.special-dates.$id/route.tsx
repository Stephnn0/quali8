import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import {
  Badge,
  InlineStack,
  Layout,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { generateDateTodos } from "app/services/assistant/dateTodos.server";
import TodoBoard from "./components/TodoBoard";
import AnnouncementScheduler from "./components/AnnouncementScheduler";
import HeroScheduler from "./components/HeroScheduler";
import PopupScheduler from "./components/PopupScheduler";
import SeoOptimizer from "./components/SeoOptimizer";
import ActionCard from "./components/ActionCard";
import styles from "./components/styles.module.css";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  const specialDate = await db.specialDate.findFirst({
    where: { id: Number(params.id), shop: session.shop },
  });
  if (!specialDate) {
    return {
      specialDate: null,
      todos: [],
      seoActions: [],
      announcementBar: null,
      hero: null,
      popup: null,
    };
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

  const [todos, seoActions, announcementBar, hero, popup] = await Promise.all([
    db.specialDateTodo.findMany({
      where: { specialDateId: specialDate.id },
      orderBy: [{ kind: "asc" }, { position: "asc" }, { id: "asc" }],
    }),
    db.seoMetaAction.findMany({
      where: { specialDateId: specialDate.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.announcementBar.findUnique({
      where: { specialDateId: specialDate.id },
    }),
    db.scheduledHero.findUnique({
      where: { specialDateId: specialDate.id },
    }),
    db.subscribePopup.findUnique({
      where: { specialDateId: specialDate.id },
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
    announcementBar: announcementBar
      ? {
          enabled: announcementBar.enabled,
          message: announcementBar.message,
          backgroundColor: announcementBar.backgroundColor,
          textColor: announcementBar.textColor,
          startDate: announcementBar.startDate,
          endDate: announcementBar.endDate,
        }
      : null,
    hero: hero
      ? {
          enabled: hero.enabled,
          imageUrl: hero.imageUrl,
          heading: hero.heading,
          description: hero.description,
          buttonLabel: hero.buttonLabel,
          buttonUrl: hero.buttonUrl,
          startDate: hero.startDate,
          endDate: hero.endDate,
        }
      : null,
    popup: popup
      ? {
          enabled: popup.enabled,
          imageUrl: popup.imageUrl,
          heading: popup.heading,
          description: popup.description,
          discountCode: popup.discountCode,
          startDate: popup.startDate,
          endDate: popup.endDate,
        }
      : null,
  };
}

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const httpsUrl = z.string().url().startsWith("https://");

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

const saveAnnouncementSchema = z.object({
  action: z.literal("save-announcement"),
  enabled: z.boolean(),
  message: z.string().trim().min(1).max(160),
  backgroundColor: hexColor,
  textColor: hexColor,
  startDate: isoDay,
  endDate: isoDay,
});
const removeAnnouncementSchema = z.object({
  action: z.literal("remove-announcement"),
});

const saveHeroSchema = z.object({
  action: z.literal("save-hero"),
  enabled: z.boolean(),
  imageUrl: httpsUrl,
  heading: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  buttonLabel: z.string().trim().max(40).optional(),
  buttonUrl: z.string().trim().max(400).optional(),
  startDate: isoDay,
  endDate: isoDay,
});
const removeHeroSchema = z.object({ action: z.literal("remove-hero") });

const savePopupSchema = z.object({
  action: z.literal("save-popup"),
  enabled: z.boolean(),
  imageUrl: httpsUrl,
  heading: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(220),
  discountCode: z.string().trim().min(1).max(40),
  startDate: isoDay,
  endDate: isoDay,
});
const removePopupSchema = z.object({ action: z.literal("remove-popup") });

const bodySchema = z.discriminatedUnion("action", [
  addTodoSchema,
  toggleTodoSchema,
  deleteTodoSchema,
  saveAnnouncementSchema,
  removeAnnouncementSchema,
  saveHeroSchema,
  removeHeroSchema,
  savePopupSchema,
  removePopupSchema,
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

    if (
      "startDate" in body &&
      "endDate" in body &&
      body.startDate > body.endDate
    ) {
      return {
        code: "error",
        errors: [{ message: "The start date must be before the end date" }],
      };
    }

    switch (body.action) {
      case "add-todo":
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

      case "toggle-todo":
        await db.specialDateTodo.updateMany({
          where: { id: body.id, specialDateId: specialDate.id },
          data: { done: body.done },
        });
        return { code: "todo-updated", errors: null };

      case "delete-todo":
        await db.specialDateTodo.deleteMany({
          where: { id: body.id, specialDateId: specialDate.id },
        });
        return { code: "todo-deleted", errors: null };

      case "save-announcement": {
        const data = {
          enabled: body.enabled,
          message: body.message,
          backgroundColor: body.backgroundColor,
          textColor: body.textColor,
          startDate: body.startDate,
          endDate: body.endDate,
        };
        await db.announcementBar.upsert({
          where: { specialDateId: specialDate.id },
          create: { shop: session.shop, specialDateId: specialDate.id, ...data },
          update: data,
        });
        return { code: "announcement-saved", errors: null };
      }

      case "remove-announcement":
        await db.announcementBar.deleteMany({
          where: { specialDateId: specialDate.id },
        });
        return { code: "announcement-removed", errors: null };

      case "save-hero": {
        const data = {
          enabled: body.enabled,
          imageUrl: body.imageUrl,
          heading: body.heading,
          description: body.description ?? null,
          buttonLabel: body.buttonLabel ?? null,
          buttonUrl: body.buttonUrl ?? null,
          startDate: body.startDate,
          endDate: body.endDate,
        };
        await db.scheduledHero.upsert({
          where: { specialDateId: specialDate.id },
          create: { shop: session.shop, specialDateId: specialDate.id, ...data },
          update: data,
        });
        return { code: "hero-saved", errors: null };
      }

      case "remove-hero":
        await db.scheduledHero.deleteMany({
          where: { specialDateId: specialDate.id },
        });
        return { code: "hero-removed", errors: null };

      case "save-popup": {
        const data = {
          enabled: body.enabled,
          imageUrl: body.imageUrl,
          heading: body.heading,
          description: body.description,
          discountCode: body.discountCode,
          startDate: body.startDate,
          endDate: body.endDate,
        };
        await db.subscribePopup.upsert({
          where: { specialDateId: specialDate.id },
          create: { shop: session.shop, specialDateId: specialDate.id, ...data },
          update: data,
        });
        return { code: "popup-saved", errors: null };
      }

      case "remove-popup":
        await db.subscribePopup.deleteMany({
          where: { specialDateId: specialDate.id },
        });
        return { code: "popup-removed", errors: null };
    }
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

const windowLabel = (start: string, end: string) =>
  `${start.slice(5)} → ${end.slice(5)}`;

type ModalKey =
  | "announcement"
  | "seo-todos"
  | "marketing-todos"
  | "seo-meta"
  | "hero"
  | "popup"
  | null;

export default function SpecialDateManage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [open, setOpen] = useState<ModalKey>(null);

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

  const seoTodos = data.todos.filter((todo) => todo.kind === "SEO");
  const marketingTodos = data.todos.filter(
    (todo) => todo.kind === "MARKETING" || todo.kind === "GENERAL",
  );
  const doneOf = (list: typeof data.todos) =>
    `${list.filter((todo) => todo.done).length} of ${list.length} done`;

  const scheduledStatus = (
    config: { enabled: boolean; startDate: string; endDate: string } | null,
  ) =>
    config
      ? config.enabled
        ? `Scheduled ${windowLabel(config.startDate, config.endDate)}`
        : "Paused"
      : "Not set up";

  const MODAL_TITLES: Record<Exclude<ModalKey, null>, string> = {
    announcement: "Homepage announcement bar",
    "seo-todos": "SEO to-dos",
    "marketing-todos": "Marketing to-dos",
    "seo-meta": "SEO for products & collections",
    hero: "Homepage hero section",
    popup: "Subscribe popup",
  };

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
          <div className={styles.grid}>
            <ActionCard
              artKey="announcement"
              title="Announcement bar"
              description="A scheduled banner across your home page with your message and colors."
              status={scheduledStatus(data.announcementBar)}
              statusActive={Boolean(data.announcementBar?.enabled)}
              onOpen={() => setOpen("announcement")}
            />
            <ActionCard
              artKey="hero"
              title="Hero section"
              description="A full-width homepage hero with an image, headline, and optional button."
              status={scheduledStatus(data.hero)}
              statusActive={Boolean(data.hero?.enabled)}
              onOpen={() => setOpen("hero")}
            />
            <ActionCard
              artKey="popup"
              title="Subscribe popup"
              description="First-time visitors subscribe and receive a discount code."
              status={scheduledStatus(data.popup)}
              statusActive={Boolean(data.popup?.enabled)}
              onOpen={() => setOpen("popup")}
            />
            <ActionCard
              artKey="seo-meta"
              title="SEO for products & collections"
              description="Rewrite meta titles and descriptions with AI, optimized for this date."
              status={
                data.seoActions.length
                  ? `${data.seoActions.length} applied`
                  : "Not started"
              }
              statusActive={data.seoActions.length > 0}
              onOpen={() => setOpen("seo-meta")}
            />
            <ActionCard
              artKey="seo-todos"
              title="SEO to-dos"
              description="Search-visibility prep for this date — suggested by your assistant."
              status={doneOf(seoTodos)}
              statusActive={
                seoTodos.length > 0 && seoTodos.every((todo) => todo.done)
              }
              onOpen={() => setOpen("seo-todos")}
            />
            <ActionCard
              artKey="marketing-todos"
              title="Marketing to-dos"
              description="Promotion prep: email, social, offers, and deadlines."
              status={doneOf(marketingTodos)}
              statusActive={
                marketingTodos.length > 0 &&
                marketingTodos.every((todo) => todo.done)
              }
              onOpen={() => setOpen("marketing-todos")}
            />
          </div>
        </Layout.Section>
      </Layout>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? MODAL_TITLES[open] : ""}
        size="large"
      >
        <Modal.Section>
          {open === "announcement" ? (
            <AnnouncementScheduler
              specialDateName={specialDate.name}
              specialDateDate={specialDate.date}
              announcementBar={data.announcementBar}
            />
          ) : null}
          {open === "hero" ? (
            <HeroScheduler
              specialDateName={specialDate.name}
              specialDateDate={specialDate.date}
              hero={data.hero}
            />
          ) : null}
          {open === "popup" ? (
            <PopupScheduler
              specialDateName={specialDate.name}
              specialDateDate={specialDate.date}
              popup={data.popup}
            />
          ) : null}
          {open === "seo-meta" ? (
            <SeoOptimizer
              specialDateId={specialDate.id}
              specialDateName={specialDate.name}
              appliedActions={data.seoActions}
            />
          ) : null}
          {open === "seo-todos" ? (
            <TodoBoard todos={data.todos} kinds={["SEO"]} />
          ) : null}
          {open === "marketing-todos" ? (
            <TodoBoard todos={data.todos} kinds={["MARKETING", "GENERAL"]} />
          ) : null}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

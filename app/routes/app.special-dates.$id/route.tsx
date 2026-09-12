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
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import TodoBoard from "app/components/Seasonal/TodoBoard";
import AnnouncementScheduler from "app/components/Seasonal/AnnouncementScheduler";
import PopupScheduler from "app/components/Seasonal/PopupScheduler";
import MenuScheduler from "app/components/Seasonal/MenuScheduler";
import SeoOptimizer from "app/components/Seasonal/SeoOptimizer";
import { daysAway, windowLabel } from "app/components/Seasonal/dates";
import {
  loadSpecialDateDetail,
  runSpecialDateAction,
  specialDateActionSchema,
} from "app/services/seasonal/specialDateDetail.server";
import ActionCard from "./components/ActionCard";
import styles from "./components/styles.module.css";

/**
 * Sales Calendar: one date with every seasonal feature on it. Not linked
 * from the nav any more — the Campaigns hub will take over this view — but
 * the route stays reachable and shares its data and mutations with the
 * standalone feature pages under /app/features.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "redirect");

  return loadSpecialDateDetail(db, session.shop, Number(params.id));
}

export async function action({ request, params }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  try {
    await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

    const formData = await request.formData();
    const body = specialDateActionSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    return await runSpecialDateAction({
      db,
      graphql: admin.graphql,
      shop: session.shop,
      specialDateId: Number(params.id),
      body,
    });
  } catch (error) {
    console.error("Special date action error:", error);
    return {
      code: "error",
      errors: [{ message: "Something went wrong. Try again." }],
    };
  }
}

type ModalKey =
  | "announcement"
  | "menu"
  | "seo-todos"
  | "marketing-todos"
  | "seo-meta"
  | "popup"
  | null;

export default function SpecialDateManage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [open, setOpen] = useState<ModalKey>(null);

  if (!data) {
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
    menu: "Navigation menu item",
    "seo-todos": "SEO Prep List",
    "marketing-todos": "Marketing Playbook",
    "seo-meta": "AI SEO Optimizer",
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
              artKey="menu"
              title="Menu item"
              description="A link in your store navigation, added and removed on schedule."
              status={
                data.menuItem
                  ? data.menuItem.live
                    ? "Live in menu"
                    : data.menuItem.enabled
                      ? `Scheduled ${windowLabel(data.menuItem.startDate, data.menuItem.endDate)}`
                      : "Paused"
                  : "Not set up"
              }
              statusActive={Boolean(data.menuItem?.live)}
              onOpen={() => setOpen("menu")}
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
              title="AI SEO Optimizer"
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
              title="SEO Prep List"
              description="Search-visibility prep for this date — suggested by your assistant."
              status={doneOf(seoTodos)}
              statusActive={
                seoTodos.length > 0 && seoTodos.every((todo) => todo.done)
              }
              onOpen={() => setOpen("seo-todos")}
            />
            <ActionCard
              artKey="marketing-todos"
              title="Marketing Playbook"
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
          {open === "menu" ? (
            <MenuScheduler
              specialDateName={specialDate.name}
              specialDateDate={specialDate.date}
              menuItem={data.menuItem}
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

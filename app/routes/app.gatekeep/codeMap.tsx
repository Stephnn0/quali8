import { type PageProps } from "@shopify/polaris";
import type { GateKeepCode } from "app/services/subscriptions/gatekeep/types";
import type { ComponentProps } from "react";
import dashboardCorner from "app/assets/dashboard-corner.svg";
import { IncentiveIcon } from "@shopify/polaris-icons";
import type { FullPageCardErrorState } from "app/components/FullPageCard/variants/FullPageCardErrorState";

const PUBLIC_ENV = {
  VITE_SHOPIFY_APP_HANDLE: "quali8",
};

const APP_CONSTANTS = {
  SHORT_NAME: "Quali8",
  URLS: {
    LANDING_PAGE: "https://8instruments.com",
  },
  TRIAL_DAYS: 5,
  // OPEN Functions for Shopify App Bridge
  OPEN_APP_PLANS_PAGE: () =>
    open(
      `shopify://admin/charges/${PUBLIC_ENV.VITE_SHOPIFY_APP_HANDLE}/pricing_plans`,
      "_top",
    ),
};

export function codeMap(code?: GateKeepCode | null): GatekeepContent {
  const defaultPage: GatekeepContent["page"] = {
    title: "You don't have access to this page",
    subtitle: "Go back to keep exploring",
  };

  switch (code) {
    case "SP001":
      return {
        page: {
          title: defaultPage.title,
          subtitle: "This page requires an active Shopify Plus plan.",
        },
        card: {
          image: dashboardCorner,
          heading: "This feature requires a Shopify Plus plan",
          children: "Upgrade or get notified when it launches for other plans.",
          action: {
            content: `Subscribe on ${APP_CONSTANTS.SHORT_NAME}`,
            onAction: () =>
              window.open(APP_CONSTANTS.URLS.LANDING_PAGE, "_blank"),
          },
        },
      };

    case "AP001":
    case "AP002":
    case "AP003":
    case "AP004":
    case "AP005":
    case "AP006":
    case "AP007":
    case "AP008":
    case "AP009":
    case "AP010":
    case "AP011":
    case "AP012":
    case "AP013":
    case "AP014":
    case "AP015":
    case "AP016":
      return {
        page: {
          title: defaultPage.title,
          subtitle: `This page requires an active ${APP_CONSTANTS.SHORT_NAME} plan.`,
        },
        card: {
          image: dashboardCorner,
          heading: `Upgrade your plan to use this ${APP_CONSTANTS.SHORT_NAME} feature`,
          children: `We offer a Free plan for you to get started. We also have a ${APP_CONSTANTS.TRIAL_DAYS}-day trial for our paid plans.`,
          action: {
            icon: IncentiveIcon,
            content: "Upgrade",
            onAction: APP_CONSTANTS.OPEN_APP_PLANS_PAGE,
          },
        },
      };
    default: {
      return {
        page: defaultPage,
        card: {
          image: dashboardCorner,
          heading: "Unauthorized Access",
          children: "You do not have permission to view this page",
          action: {
            content: "Go back",
            url: "/app",
          },
        },
      };
    }
  }
}

type GatekeepContent = {
  page: Pick<PageProps, "title" | "subtitle">;
  card: ComponentProps<typeof FullPageCardErrorState>;
};

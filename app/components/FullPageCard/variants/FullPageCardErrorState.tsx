import { useNavigate } from "react-router";
import type { To } from "@react-router/router/history";
import type { EmptyStateProps } from "@shopify/polaris";
import { EmptyState, Text } from "@shopify/polaris";
import { EmailIcon } from "@shopify/polaris-icons";
import type { PropsWithChildren } from "react";
import domains from "app/assets/domains.svg";
import { FullPageCard } from "..";

type FullPageCardErrorStateProps = Partial<
  Pick<EmptyStateProps, "heading" | "image">
> & {
  action?: EmptyStateProps["action"] | { content: string; href: To } | false;
  secondaryAction?:
    | EmptyStateProps["secondaryAction"]
    | { content: string; href: To }
    | false;
};

export function FullPageCardErrorState({
  action,
  secondaryAction,
  heading,
  image,
  children,
}: FullPageCardErrorStateProps & PropsWithChildren) {
  const navigate = useNavigate();

  const navigateAction = action && "href" in action ? action : undefined;
  const defaultAction =
    action === false
      ? undefined
      : action || {
          content: "Reload page",
          onAction: () => navigate(".", { replace: true }),
        };

  const defaultNavigateAction =
    secondaryAction && "href" in secondaryAction ? secondaryAction : undefined;
  const defaultSecondaryAction =
    secondaryAction === false
      ? undefined
      : secondaryAction || {
          target: "_top",
          icon: EmailIcon,
          content: "Contact us",
          url: `mailto:support@8instruments.com`,
        };

  return (
    <FullPageCard alignAllCenter pagePadding>
      <EmptyState
        heading={heading || "There's a problem loading this page"}
        action={
          navigateAction
            ? {
                content: navigateAction.content,
                onAction: () => navigate(navigateAction.href),
              }
            : defaultAction
        }
        image={image || domains}
        secondaryAction={
          defaultNavigateAction
            ? {
                content: defaultNavigateAction.content,
                onAction: () => navigate(defaultNavigateAction.href),
              }
            : defaultSecondaryAction
        }
      >
        {children || (
          <Text as="p" alignment="center">
            Reload the page, try again later or contact us.
          </Text>
        )}
      </EmptyState>
    </FullPageCard>
  );
}

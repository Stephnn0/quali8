import { useNavigate } from "react-router";
import type { To } from "@react-router/router/history";
import type { EmptyStateProps } from "@shopify/polaris";
import { EmptyState, Text } from "@shopify/polaris";
import type { PropsWithChildren } from "react";
import chair from "app/assets/chair.svg";
import type { FullPageCardProps } from "../FullPageCard";
import FullPageCard from "../FullPageCard";

type FullPageCardEmptyStateProps = Partial<
  Pick<EmptyStateProps, "heading" | "image">
> & {
  action?: EmptyStateProps["action"] | { content: string; href: To };
  noAction?: boolean;
} & Pick<FullPageCardProps, "noMaxWidth">;

export function FullPageCardEmptyState({
  action,
  heading,
  image,
  noMaxWidth,
  noAction,
  children,
}: FullPageCardEmptyStateProps & PropsWithChildren) {
  const navigate = useNavigate();

  const navigateAction = action && "href" in action ? action : undefined;
  const defaultAction = action || {
    content: "Go back",
    onAction: () => navigate(-1),
  };

  return (
    <FullPageCard alignAllCenter pagePadding noMaxWidth={noMaxWidth}>
      <EmptyState
        heading={heading || "There's nothing to show here."}
        action={
          noAction
            ? undefined
            : navigateAction
              ? {
                  content: navigateAction.content,
                  onAction: () => navigate(navigateAction.href),
                }
              : defaultAction
        }
        image={image || chair}
      >
        {children || (
          <Text as="p" alignment="center">
            Make sure this page is set up correctly.
          </Text>
        )}
      </EmptyState>
    </FullPageCard>
  );
}

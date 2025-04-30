import { Link } from "@remix-run/react";
import type { BadgeProps } from "@shopify/polaris";
import {
  Badge,
  BlockStack,
  Button,
  InlineGrid,
  InlineStack,
  Text,
} from "@shopify/polaris";
import ConditionalWrapper from "app/components/ConditionalWrapper/ConditionalWrapper";
import type { ReactNode } from "react";

type CardHeaderProps = {
  icon: ReactNode;
  title: string;
  badge?: BadgeProps;
  subtitle: string;
  action?: { url: string; content: string; disabled?: boolean };
  disabled?: boolean;
};

export default function CardHeader({
  title,
  subtitle,
  icon,
  action,
  disabled,
  badge,
}: CardHeaderProps) {
  const renderLink = (url: string, children: ReactNode) => (
    <Link to={url}>{children}</Link>
  );

  return (
    <BlockStack gap="300">
      <InlineGrid alignItems="center" columns="1fr auto">
        <InlineStack gap="150" blockAlign="center">
          {icon}
          <Text
            as="h2"
            variant="headingLg"
            tone={disabled ? "disabled" : "base"}
          >
            {title}
          </Text>
          {badge && <Badge {...badge} />}
        </InlineStack>

        {action && (
          <ConditionalWrapper
            condition={!action.disabled}
            wrapper={(children) => renderLink(action.url, children)}
          >
            <Button
              accessibilityLabel={action.content}
              disabled={disabled || action.disabled}
            >
              {action.content}
            </Button>
          </ConditionalWrapper>
        )}
      </InlineGrid>
      <Text as="p" variant="bodyMd" tone={disabled ? "disabled" : "base"}>
        {subtitle}
      </Text>
    </BlockStack>
  );
}

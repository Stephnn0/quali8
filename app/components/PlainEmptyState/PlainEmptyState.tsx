import { Link } from "@remix-run/react";
import { BlockStack, Button, Text } from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";
import type { ReactNode } from "react";
import "./styles.css";

type Action = {
  content: string;
} & (
  | { url: string; onClick?: never; external?: boolean }
  | { onClick: () => void; url?: never; external?: never }
);

export type PlainEmptyStateProps = {
  title: string;
  description: string;
  action?: Action;
  style?: React.CSSProperties;
};

export default function PlainEmptyState({
  title,
  description,
  action,
  style,
}: PlainEmptyStateProps) {
  const actionComponent = createAction(action);
  return (
    <div style={style} className="container">
      <BlockStack align="center" inlineAlign="center" gap="400">
        <BlockStack align="center" inlineAlign="center" gap="150">
          <Text as="p" variant="headingMd" fontWeight="bold" alignment="center">
            {title}
          </Text>
          <Text as="p" variant="bodySm" alignment="center">
            {description}
          </Text>
        </BlockStack>
        {actionComponent}
      </BlockStack>
    </div>
  );
}

function createAction(action?: Action): ReactNode {
  if (!action) return null;
  const { content, onClick, url, external } = action;

  if (url && onClick) {
    throw new Error(
      "Only one of 'url' or 'onClick' can be provided, not both.",
    );
  }

  if (url) {
    return (
      <Link to={url} target={external ? "_blank" : undefined}>
        <Button
          size="slim"
          accessibilityLabel={content}
          variant="primary"
          icon={external ? ExternalIcon : undefined}
        >
          {content}
        </Button>
      </Link>
    );
  }
  if (onClick) {
    return (
      <Button
        size="slim"
        accessibilityLabel={content}
        onClick={onClick}
        variant="primary"
      >
        {content}
      </Button>
    );
  }

  throw new Error("Either 'url' or 'onClick' must be provided.");
}

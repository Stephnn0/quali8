import type { CardProps } from "@shopify/polaris";
import { Card } from "@shopify/polaris";
import styles from "./styles.module.css";

export const STYLES = {
  PAGE: {
    MAX_WIDTH_PX: 1200,
  },
} as const;

export type FullPageCardProps = {
  noMaxWidth?: boolean;
  alignAllCenter?: boolean;
  pagePadding?: boolean;
  cardProps?: Omit<CardProps, "children">;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

/**
 * Must be a direct child of `AppSurfaceLayout`.
 */
export default function FullPageCard({
  children: cardChildren,
  cardProps,
  className,
  pagePadding,
  alignAllCenter,
  noMaxWidth = false,
  ...divProps
}: FullPageCardProps) {
  return (
    <div
      className={`${className || ""} ${styles.container} ${alignAllCenter ? styles.containerAlignAllCenter : ""} ${pagePadding ? styles.containerPagePadding : ""}`}
      {...divProps}
      style={{ maxWidth: noMaxWidth ? "auto" : STYLES.PAGE.MAX_WIDTH_PX }}
    >
      <Card {...cardProps}>{cardChildren}</Card>
    </div>
  );
}

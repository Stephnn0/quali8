import type { CardProps } from "@shopify/polaris";
import { Card } from "@shopify/polaris";
import styles from "./styles.module.css";

export type FullPageCardProps = {
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
export function FullPageCard({
  children: cardChildren,
  cardProps,
  className,
  pagePadding,
  alignAllCenter,
  ...divProps
}: FullPageCardProps) {
  return (
    <div
      className={`${className || ""} ${styles.container} ${alignAllCenter ? styles.containerAlignAllCenter : ""} ${pagePadding ? styles.containerPagePadding : ""}`}
      {...divProps}
    >
      <Card {...cardProps}>{cardChildren}</Card>
    </div>
  );
}

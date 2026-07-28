import { BlockStack, Text } from "@shopify/polaris";
import type { SpendBucket } from "app/services/audiences/customerInsights";
import styles from "./styles.module.css";

/** Horizontal single-series bars with direct labels (spend distribution). */
export function BarList({ buckets }: { buckets: SpendBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className={styles.vizRoot}>
      <BlockStack gap="300">
        {buckets.map((bucket) => (
          <div
            key={bucket.label}
            className={styles.barRow}
            title={`${bucket.label}: ${bucket.count}`}
          >
            <Text as="span" variant="bodySm" tone="subdued">
              {bucket.label}
            </Text>
            <div className={styles.barTrack}>
              <div
                className={`${styles.barFill} ${
                  bucket.count === 0 ? styles.barFillEmpty : ""
                }`}
                style={{ width: `${(bucket.count / max) * 100}%` }}
              />
            </div>
            <Text as="span" variant="bodySm" numeric alignment="end">
              {bucket.count}
            </Text>
          </div>
        ))}
      </BlockStack>
    </div>
  );
}

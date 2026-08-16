import { getOneAppFeature } from "./features";
import styles from "./oneapp.module.css";

/**
 * Compact "01 · Smart Shipping" chip for detail pages, rendered through the
 * Polaris `<Page titleMetadata>` slot so the record title stays the title.
 */
export default function FeatureEyebrow({ featureKey }: { featureKey: string }) {
  const feature = getOneAppFeature(featureKey);

  return (
    <span className={styles.eyebrowChip}>
      <span className={styles.eyebrowChipNumber}>{feature.number}</span>
      {feature.name}
    </span>
  );
}

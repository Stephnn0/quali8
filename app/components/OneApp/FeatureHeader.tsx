import type { ReactNode } from "react";
import { getOneAppFeature } from "./features";
import styles from "./oneapp.module.css";

type Props = {
  /** Key into the OneApp feature registry (e.g. "smart-shipping"). */
  featureKey: string;
  /** Overrides the registry tagline when a page needs longer context. */
  tagline?: string;
  /** Header-level actions (usually the page's primary button). */
  actions?: ReactNode;
};

/**
 * The shared page header for feature index pages: catalog-entry layout with
 * the feature's index numeral leading the name. Replaces the Polaris
 * `<Page title>` header so every feature page opens the same way.
 */
export default function FeatureHeader({ featureKey, tagline, actions }: Props) {
  const feature = getOneAppFeature(featureKey);

  return (
    <header className={styles.pageHeader}>
      <span className={styles.pageHeaderNumber} aria-hidden>
        {feature.number}
      </span>
      <div className={styles.pageHeaderBody}>
        <p className={styles.pageHeaderEyebrow}>OneApp</p>
        <h1 className={styles.pageHeaderTitle}>{feature.name}</h1>
        <p className={styles.pageHeaderTagline}>
          {tagline ?? feature.tagline}
        </p>
      </div>
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </header>
  );
}

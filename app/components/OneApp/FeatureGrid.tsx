import { Link } from "react-router";
import { Icon } from "@shopify/polaris";
import { useGatekeepFeature } from "app/services/subscriptions/hooks/useGatekeepFeature";
import {
  ONEAPP_CATEGORIES,
  categoryPath,
  getCategoryFeatures,
  type OneAppFeature,
} from "./features";
import PlanBanner from "./PlanBanner";
import styles from "./oneapp.module.css";

function FeatureCard({ feature }: { feature: OneAppFeature }) {
  const locked = useGatekeepFeature(feature.gate ?? {});

  return (
    <Link to={feature.to} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardNumber}>{feature.number}</span>
        <PlanBanner plan={feature.plan} locked={locked} compact />
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardIcon}>
          <Icon source={feature.icon} />
        </span>
        <h3 className={styles.cardName}>{feature.name}</h3>
        <p className={styles.cardTagline}>{feature.tagline}</p>
      </div>
      <div className={styles.cardFoot}>
        <span className={styles.cardOpen}>Open →</span>
      </div>
      <span className={styles.cardGhost} aria-hidden>
        {feature.number}
      </span>
    </Link>
  );
}

/** The whole library, grouped by category in index order. */
export default function FeatureGrid() {
  return (
    <div className={styles.groups}>
      {ONEAPP_CATEGORIES.map((category) => {
        const features = getCategoryFeatures(category.key);
        if (features.length === 0) return null;
        return (
          <section key={category.key} className={styles.group}>
            <div className={styles.groupHeading}>
              <div>
                <h3 className={styles.groupTitle}>{category.name}</h3>
                <p className={styles.groupTagline}>{category.tagline}</p>
              </div>
              <Link to={categoryPath(category.key)} className={styles.groupLink}>
                View category →
              </Link>
            </div>
            <div className={styles.grid}>
              {features.map((feature) => (
                <FeatureCard key={feature.key} feature={feature} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

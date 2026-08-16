import { Link } from "react-router";
import { Badge, Icon } from "@shopify/polaris";
import { useGatekeepFeature } from "app/services/subscriptions/hooks/useGatekeepFeature";
import { ONEAPP_FEATURES, type OneAppFeature } from "./features";
import styles from "./oneapp.module.css";

function FeatureCard({ feature }: { feature: OneAppFeature }) {
  const locked = useGatekeepFeature(feature.gate ?? {});

  return (
    <Link to={feature.to} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardNumber}>{feature.number}</span>
        {feature.plan && locked ? <Badge>{`${feature.plan} plan`}</Badge> : null}
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

/** The whole library, in index order. */
export default function FeatureGrid() {
  return (
    <div className={styles.grid}>
      {ONEAPP_FEATURES.map((feature) => (
        <FeatureCard key={feature.key} feature={feature} />
      ))}
    </div>
  );
}

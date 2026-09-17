import { useNavigate } from "react-router";
import { Button, Icon } from "@shopify/polaris";
import { useGatekeepFeature } from "app/services/subscriptions/hooks/useGatekeepFeature";
import type { OneAppFeature } from "./features";
import PlanBanner from "./PlanBanner";
import styles from "./oneapp.module.css";

/**
 * The category-page card: the feature's illustration with its plan banner,
 * what it does, and one button that opens the feature.
 */
export default function FeatureShowcaseCard({
  feature,
}: {
  feature: OneAppFeature;
}) {
  const navigate = useNavigate();
  const locked = useGatekeepFeature(feature.gate ?? {});

  return (
    <article className={styles.showcase}>
      <div className={styles.showcaseMedia}>
        <img
          className={styles.showcaseImage}
          src={feature.image}
          alt={`${feature.name} preview`}
          loading="lazy"
        />
        <PlanBanner plan={feature.plan} locked={locked} />
      </div>
      <div className={styles.showcaseBody}>
        <div className={styles.showcaseTitleRow}>
          <span className={styles.cardIcon}>
            <Icon source={feature.icon} />
          </span>
          <div>
            <span className={styles.cardNumber}>{feature.number}</span>
            <h3 className={styles.showcaseName}>{feature.name}</h3>
          </div>
        </div>
        <p className={styles.showcaseTagline}>{feature.tagline}</p>
        {feature.planNote ? (
          <p className={styles.showcasePlanNote}>{feature.planNote}</p>
        ) : null}
        <p className={styles.showcaseText}>{feature.description}</p>
      </div>
      <div className={styles.showcaseFoot}>
        <Button variant="primary" onClick={() => navigate(feature.to)}>
          {`Open ${feature.name}`}
        </Button>
      </div>
    </article>
  );
}

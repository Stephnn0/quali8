import { Button } from "@shopify/polaris";
import { useNavigate } from "react-router";
import { NEXT_FEATURE_NUMBER, requestFeatureMailto } from "./features";
import styles from "./oneapp.module.css";

/**
 * "Request a feature", styled as the library's next, still-empty slot.
 * The dashed border and the next index number say it before the copy does:
 * this library grows, and merchants decide what ships next.
 */
export default function RequestFeatureBand() {
  const navigate = useNavigate();

  return (
    <div className={styles.requestBand}>
      <span className={styles.requestNumber} aria-hidden>
        {NEXT_FEATURE_NUMBER}
      </span>
      <div className={styles.requestBody}>
        <h2 className={styles.requestHeading}>Need another feature?</h2>
        <p className={styles.requestLead}>Tell us what your store needs.</p>
        <p className={styles.requestText}>
          Don&rsquo;t see the feature you need? Request it and we&rsquo;ll
          build it — it ships into your library, no extra app to install.
        </p>
      </div>
      <div className={styles.requestActions}>
        <Button variant="primary" onClick={() => navigate("/app/request-feature")}>
          Request a feature
        </Button>
        <Button url={requestFeatureMailto()} target="_top" variant="plain">
          Email us instead
        </Button>
      </div>
    </div>
  );
}

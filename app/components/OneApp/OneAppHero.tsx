import { ONEAPP_FEATURES } from "./features";
import styles from "./oneapp.module.css";

/**
 * The dashboard masthead: OneApp's positioning in one glance.
 * The ghosted numeral is the library's current size — it grows as features ship.
 */
export default function OneAppHero() {
  const count = String(ONEAPP_FEATURES.length).padStart(2, "0");

  return (
    <div className={styles.hero}>
      <p className={styles.heroEyebrow}>OneApp</p>
      <h1 className={styles.heroTitle}>
        Your Features<span>.</span>
      </h1>
      <p className={styles.heroText}>
        Multiple Shopify features. One app. Every feature below is installed
        and ready — and when your store needs something new, you can request
        it.
      </p>
      <div className={styles.heroMeta}>
        <span className={styles.heroPill}>
          <strong>{count}</strong> features in your library
        </span>
        <span className={styles.heroPill}>One install, one subscription</span>
      </div>
      <span className={styles.heroGhost} aria-hidden>
        {count}
      </span>
    </div>
  );
}

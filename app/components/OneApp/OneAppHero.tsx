import { Icon } from "@shopify/polaris";
import { ONEAPP_FEATURES } from "./features";
import styles from "./oneapp.module.css";

/**
 * The dashboard masthead: OneApp's positioning in one glance.
 * Left: the headline and library facts. Right: the
 * feature library as a cluster of tiles that settle into place on load
 * and keep drifting slowly. Behind everything, two soft light orbs move.
 * All motion is decorative and turns off under prefers-reduced-motion.
 */
export default function OneAppHero() {
  const count = String(ONEAPP_FEATURES.length).padStart(2, "0");

  return (
    <section className={styles.hero} aria-label="OneApp">
      <span className={`${styles.heroOrb} ${styles.heroOrbGold}`} aria-hidden />
      <span className={`${styles.heroOrb} ${styles.heroOrbLilac}`} aria-hidden />
      <span className={styles.heroGridLines} aria-hidden />

      <div className={styles.heroBody}>
        <h1 className={styles.heroTitle}>
          Every feature your store needs<span className={styles.heroDot}>.</span>
          <br />
          <span className={styles.heroTitleAccent}>One app.</span>
        </h1>
        <p className={styles.heroText}>
          Shipping discounts, bundles, audiences, seasonal campaigns, and AI
          content, installed and ready. When your store needs something new,
          request it and it ships into your library.
        </p>

        <div className={styles.heroMeta}>
          <span className={styles.heroPill}>
            <span className={styles.heroLive} aria-hidden />
            <strong>{count}</strong> features live
          </span>
          <span className={styles.heroPill}>One install, one subscription</span>
        </div>
      </div>

      <div className={styles.heroCluster} aria-hidden>
        {ONEAPP_FEATURES.map((feature, index) => (
          <span
            key={feature.key}
            className={styles.heroTile}
            style={{ "--i": index } as React.CSSProperties}
          >
            <span className={styles.heroTileNumber}>{feature.number}</span>
            <span className={styles.heroTileIcon}>
              <Icon source={feature.icon} />
            </span>
            <span className={styles.heroTileName}>{feature.name}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

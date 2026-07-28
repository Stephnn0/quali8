import HeroIllustration from "./HeroIllustration";
import styles from "./styles.module.css";

export default function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Quali8</p>
        <h1 className={styles.title}>
          Sell more to the customers you know best
        </h1>
        <p className={styles.subtitle}>
          Build audiences from customer behavior, then put them to work:
          shipping discounts at checkout, product bundles, and smart gift
          recommendations right on your storefront.
        </p>
      </div>
      <div className={styles.art}>
        <HeroIllustration />
      </div>
    </div>
  );
}

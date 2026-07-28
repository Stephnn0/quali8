import HeroIllustration from "./HeroIllustration";
import styles from "./styles.module.css";

export default function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Quali8</p>
        <h1 className={styles.title}>
          Shipping discounts for the customers you choose
        </h1>
        <p className={styles.subtitle}>
          Group customers into audiences by tags, order history, and spending —
          then reward them with automatic or code-based shipping discounts at
          checkout.
        </p>
      </div>
      <div className={styles.art}>
        <HeroIllustration />
      </div>
    </div>
  );
}

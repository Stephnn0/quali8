import styles from "../../app.bundles._index/bundles.module.css";

type Props = { number: string; title: string; text: string };

export function SectionHead({ number, title, text }: Props) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.sectionNumber}>{number}</span>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionText}>{text}</p>
      </div>
    </div>
  );
}

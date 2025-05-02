import { Text } from "@shopify/polaris";
import styles from "./styles.module.css";

export default function Footer() {
  return (
    <footer className={styles.container}>
      <Text alignment="center" as="span">
        @8Instruments. All rights reserved.
      </Text>
    </footer>
  );
}

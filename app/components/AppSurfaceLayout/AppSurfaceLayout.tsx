import type { PropsWithChildren } from "react";
import styles from "./styles.module.css";
import Footer from "../Footer/Footer";

export default function AppSurfaceLayout({ children }: PropsWithChildren) {
  return (
    <main className={styles.container}>
      {children}
      <Footer />
    </main>
  );
}

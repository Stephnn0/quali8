import type { ReactNode } from "react";
import styles from "./styles.module.css";

const white = { stroke: "#ffffff", strokeWidth: 2, fill: "none" } as const;

export const CARD_ART: Record<string, { gradient: string; glyph: ReactNode }> = {
  announcement: {
    gradient: "linear-gradient(135deg, #2c1f58, #5c3d99)",
    glyph: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <g {...white} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 8 17 v 6 h 5 l 12 7 V 10 L 13 17 z" />
          <path d="M 29 15 a 6 6 0 0 1 0 10" />
        </g>
      </svg>
    ),
  },
  "seo-todos": {
    gradient: "linear-gradient(135deg, #1e5b46, #3d9970)",
    glyph: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <g {...white} strokeLinecap="round">
          <circle cx="17" cy="17" r="8" />
          <line x1="23" y1="23" x2="31" y2="31" />
          <path d="M 13.5 17 l 2.5 2.5 l 5 -5" />
        </g>
      </svg>
    ),
  },
  "marketing-todos": {
    gradient: "linear-gradient(135deg, #8a2e5c, #d55181)",
    glyph: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <g {...white} strokeLinecap="round">
          <line x1="10" y1="30" x2="10" y2="22" />
          <line x1="17" y1="30" x2="17" y2="16" />
          <line x1="24" y1="30" x2="24" y2="20" />
          <line x1="31" y1="30" x2="31" y2="11" />
        </g>
      </svg>
    ),
  },
  "seo-meta": {
    gradient: "linear-gradient(135deg, #8a6210, #d9a441)",
    glyph: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <g {...white} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 10 8 h 14 l 6 6 v 18 H 10 z" />
          <line x1="15" y1="19" x2="25" y2="19" />
          <line x1="15" y1="24" x2="25" y2="24" />
        </g>
      </svg>
    ),
  },
  hero: {
    gradient: "linear-gradient(135deg, #1d3a63, #3e6ea5)",
    glyph: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <g {...white} strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="10" width="24" height="20" rx="2.5" />
          <circle cx="15" cy="17" r="2.5" />
          <path d="M 10 27 l 7 -7 l 5 5 l 4 -4 l 4 4" />
        </g>
      </svg>
    ),
  },
  popup: {
    gradient: "linear-gradient(135deg, #4a3aa7, #9085e9)",
    glyph: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <g {...white} strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="12" width="24" height="16" rx="2.5" />
          <path d="M 8 14 l 12 9 l 12 -9" />
        </g>
      </svg>
    ),
  },
};

type Props = {
  artKey: keyof typeof CARD_ART;
  title: string;
  description: string;
  status: string | null;
  statusActive?: boolean;
  onOpen: () => void;
};

export default function ActionCard({
  artKey,
  title,
  description,
  status,
  statusActive,
  onOpen,
}: Props) {
  const art = CARD_ART[artKey];
  return (
    <button type="button" className={styles.actionCard} onClick={onOpen}>
      <div className={styles.art} style={{ background: art.gradient }}>
        {art.glyph}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        {status ? (
          <span
            className={`${styles.status} ${statusActive ? styles.statusActive : ""}`}
          >
            {status}
          </span>
        ) : null}
      </div>
    </button>
  );
}

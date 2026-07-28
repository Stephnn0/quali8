import styles from "./styles.module.css";

/**
 * The dashboard signature: a shipping route that starts at a customer
 * audience, passes through a discount tag, and ends at the storefront —
 * the exact pipeline the app automates.
 */
export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 300"
      role="img"
      aria-label="A shipping route from a customer audience, through a discount tag, to a storefront"
      className={styles.illustration}
    >
      {/* soft backdrop rings */}
      <circle cx="380" cy="150" r="130" fill="none" stroke="#B9A7E6" strokeOpacity="0.12" strokeWidth="1.5" />
      <circle cx="380" cy="150" r="90" fill="none" stroke="#B9A7E6" strokeOpacity="0.16" strokeWidth="1.5" />

      {/* the route */}
      <path
        d="M 70 218 C 150 218 150 120 240 120 C 330 120 320 210 420 210"
        fill="none"
        stroke="#F0C46C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="2 10"
        className={styles.route}
      />

      {/* audience node */}
      <g>
        <circle cx="70" cy="218" r="44" fill="#FFFFFF" fillOpacity="0.06" stroke="#B9A7E6" strokeOpacity="0.5" strokeWidth="1.5" />
        {/* two regular customers */}
        <g stroke="#B9A7E6" strokeWidth="2" fill="none" strokeLinecap="round">
          <circle cx="52" cy="206" r="7" />
          <path d="M 41 232 C 41 222 63 222 63 232" />
          <circle cx="88" cy="206" r="7" />
          <path d="M 77 232 C 77 222 99 222 99 232" />
        </g>
        {/* the qualified customer, highlighted */}
        <g stroke="#F0C46C" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <circle cx="70" cy="216" r="8" />
          <path d="M 57 245 C 57 233 83 233 83 245" />
        </g>
      </g>

      {/* discount tag on the route */}
      <g transform="rotate(-12 240 120)">
        <rect x="212" y="96" width="56" height="48" rx="10" fill="#F0C46C" />
        <circle cx="240" cy="96" r="5" fill="#2C1F58" stroke="#F0C46C" strokeWidth="3" />
        <g stroke="#2C1F58" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <line x1="228" y1="132" x2="252" y2="108" />
          <circle cx="229" cy="111" r="4.5" />
          <circle cx="251" cy="129" r="4.5" />
        </g>
      </g>

      {/* delivery truck riding the route */}
      <g stroke="#B9A7E6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="300" y="164" width="52" height="32" rx="4" fill="#FFFFFF" fillOpacity="0.06" />
        <path d="M 352 174 h 18 l 10 12 v 10 h -28 z" fill="#FFFFFF" fillOpacity="0.06" />
        <circle cx="316" cy="200" r="7" fill="#2C1F58" />
        <circle cx="362" cy="200" r="7" fill="#2C1F58" />
        {/* motion lines */}
        <g stroke="#F0C46C" strokeOpacity="0.7">
          <line x1="282" y1="172" x2="292" y2="172" />
          <line x1="276" y1="182" x2="290" y2="182" />
        </g>
      </g>

      {/* storefront destination */}
      <g stroke="#B9A7E6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 420 210 v -34 h 76 v 34" fill="#FFFFFF" fillOpacity="0.06" />
        <line x1="420" y1="210" x2="496" y2="210" />
        {/* awning */}
        <path
          d="M 414 176 l 8 -16 h 64 l 8 16 c 0 8 -12 8 -13.5 0 c -1 8 -12.5 8 -13.5 0 c -1 8 -12.5 8 -13.5 0 c -1 8 -12.5 8 -13.5 0 c -1.5 8 -13.5 8 -13.5 0 z"
          fill="#F0C46C"
          fillOpacity="0.9"
          stroke="none"
        />
        {/* door */}
        <path d="M 448 210 v -18 h 20 v 18" />
      </g>

      {/* quiet sparkles */}
      <g fill="#F0C46C">
        <circle cx="180" cy="70" r="2.5" fillOpacity="0.8" />
        <circle cx="452" cy="120" r="2" fillOpacity="0.6" />
        <circle cx="120" cy="150" r="2" fillOpacity="0.5" />
      </g>
    </svg>
  );
}

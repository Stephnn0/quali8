import { BlockStack, Card, InlineStack, Text } from "@shopify/polaris";
import styles from "./styles.module.css";

function AudienceIcon() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <g stroke="#5C3D99" strokeWidth="2" fill="none" strokeLinecap="round">
        <circle cx="14" cy="17" r="4.5" />
        <path d="M 6.5 33 C 6.5 26 21.5 26 21.5 33" />
        <circle cx="30" cy="17" r="4.5" />
        <path d="M 22.5 33 C 22.5 26 37.5 26 37.5 33" />
      </g>
      <circle cx="33" cy="12" r="6" fill="#F0C46C" />
      <path
        d="M 30.5 12 l 2 2 l 3.5 -4"
        stroke="#2C1F58"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShippingIcon() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <g
        stroke="#5C3D99"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="14" width="20" height="14" rx="2.5" />
        <path d="M 26 18 h 7 l 5 6 v 4 h -12 z" />
        <circle cx="13" cy="32" r="3" />
        <circle cx="31" cy="32" r="3" />
      </g>
      <g stroke="#D9A441" strokeWidth="2" strokeLinecap="round">
        <line x1="2" y1="18" x2="5" y2="18" />
        <line x1="0" y1="23" x2="4" y2="23" />
      </g>
    </svg>
  );
}

function BundleIcon() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <g
        stroke="#5C3D99"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7" y="18" width="14" height="14" rx="2" />
        <rect x="23" y="18" width="14" height="14" rx="2" />
        <line x1="14" y1="18" x2="14" y2="32" strokeOpacity="0.4" />
        <line x1="30" y1="18" x2="30" y2="32" strokeOpacity="0.4" />
      </g>
      <g transform="rotate(-12 22 12)">
        <rect x="15" y="6" width="14" height="11" rx="3" fill="#F0C46C" />
        <text
          x="22"
          y="14.5"
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill="#2C1F58"
        >
          %
        </text>
      </g>
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <path
        d="M 20 8 L 23 18 L 33 21 L 23 24 L 20 34 L 17 24 L 7 21 L 17 18 Z"
        fill="#F0C46C"
      />
      <g stroke="#5C3D99" strokeWidth="2" strokeLinecap="round">
        <line x1="34" y1="9" x2="34" y2="15" />
        <line x1="31" y1="12" x2="37" y2="12" />
        <line x1="36" y1="30" x2="36" y2="34" />
        <line x1="34" y1="32" x2="38" y2="32" />
      </g>
    </svg>
  );
}

const FEATURES = [
  {
    icon: <AudienceIcon />,
    title: "Audiences",
    detail:
      "Group customers by tags, order history, and spending — with store-wide customer analytics.",
  },
  {
    icon: <ShippingIcon />,
    title: "Shipping promotions",
    detail:
      "Automatic or code-based shipping discounts at checkout, targeted at your audiences.",
  },
  {
    icon: <BundleIcon />,
    title: "Product bundles",
    detail:
      "Frequently-bought-together offers on product pages, discounted automatically at checkout.",
  },
  {
    icon: <SparkleIcon />,
    title: "Smart recommendations",
    detail:
      "Occasion, recipient, and budget-aware product picks on product and cart pages.",
  },
];

/** The four modules of the app, described — navigation stays in the sidebar. */
export default function Features() {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          What Quali8 does for your store
        </Text>

        <BlockStack gap="400">
          {FEATURES.map((feature) => (
            <InlineStack
              key={feature.title}
              gap="300"
              wrap={false}
              blockAlign="start"
            >
              <div className={styles.featureIcon}>{feature.icon}</div>
              <BlockStack gap="050">
                <Text as="h3" fontWeight="medium">
                  {feature.title}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {feature.detail}
                </Text>
              </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

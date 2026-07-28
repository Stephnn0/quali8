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

function PromotionIcon() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <g transform="rotate(-10 22 22)">
        <rect x="8" y="12" width="28" height="22" rx="5" fill="#F0C46C" />
        <g
          stroke="#2C1F58"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        >
          <line x1="15" y1="29" x2="29" y2="17" />
          <circle cx="16" cy="18.5" r="2.6" />
          <circle cx="28" cy="27.5" r="2.6" />
        </g>
      </g>
    </svg>
  );
}

function CheckoutIcon() {
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

const STEPS = [
  {
    icon: <AudienceIcon />,
    title: "Build an audience",
    detail:
      "Combine conditions like customer tags, order count, and total spent to define who qualifies.",
  },
  {
    icon: <PromotionIcon />,
    title: "Create a promotion",
    detail:
      "Set a percentage or fixed shipping discount — automatic or with a code — and pick your audiences.",
  },
  {
    icon: <CheckoutIcon />,
    title: "Checkout does the rest",
    detail:
      "Qualified customers see their shipping discount applied at checkout. Everyone else pays full rates.",
  },
];

export default function HowItWorks() {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          How Quali8 works
        </Text>

        <BlockStack gap="400">
          {STEPS.map((step, index) => (
            <InlineStack
              key={step.title}
              gap="300"
              wrap={false}
              blockAlign="start"
            >
              <div className={styles.stepIcon}>{step.icon}</div>
              <BlockStack gap="050">
                <Text as="h3" fontWeight="medium">
                  {index + 1}. {step.title}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {step.detail}
                </Text>
              </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

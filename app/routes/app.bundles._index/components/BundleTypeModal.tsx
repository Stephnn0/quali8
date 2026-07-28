import { Badge, BlockStack, Button, InlineStack, Modal, Text } from "@shopify/polaris";

/**
 * "Select the bundle type which suits you best" — shown when the merchant
 * clicks Create. Only classic bundles exist today; the other types are
 * roadmap teasers and stay disabled.
 */

type BundleTypeModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectClassic: () => void;
};

type BundleTypeCard = {
  key: string;
  title: string;
  badge?: { label: string; tone: "success" | "info" };
  summary: string;
  available: boolean;
};

const BUNDLE_TYPES: BundleTypeCard[] = [
  {
    key: "classic",
    title: "Classic bundle",
    badge: { label: "Popular", tone: "success" },
    summary:
      "Offer a set of products together at a percentage discount, shown on the product pages of the included products.",
    available: true,
  },
  {
    key: "quantity-breaks",
    title: "Quantity breaks",
    badge: { label: "New!", tone: "info" },
    summary: "Buy more of the same product, save more — tiered quantity pricing.",
    available: false,
  },
  {
    key: "volume-discount",
    title: "Volume discount",
    summary: "Bulk discounts that grow with the number of items in the cart.",
    available: false,
  },
  {
    key: "mix-match",
    title: "Mix & Match bundle",
    summary: "Let shoppers build their own box from a pool of products.",
    available: false,
  },
];

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--p-color-border, #e3e3e3)",
  borderRadius: 12,
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  height: "100%",
  boxSizing: "border-box",
};

export function BundleTypeModal({
  open,
  onClose,
  onSelectClassic,
}: BundleTypeModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select the bundle type which suits you best"
      size="large"
    >
      <Modal.Section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {BUNDLE_TYPES.map((type) => (
            <div key={type.key} style={{ ...cardStyle, opacity: type.available ? 1 : 0.65 }}>
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center" wrap={false}>
                  <Text as="h3" variant="headingSm">
                    {type.title}
                  </Text>
                  {type.badge ? (
                    <Badge tone={type.badge.tone}>{type.badge.label}</Badge>
                  ) : null}
                </InlineStack>
                <Text as="p" tone="subdued" variant="bodySm">
                  {type.summary}
                </Text>
              </BlockStack>
              <div style={{ marginTop: "auto" }}>
                {type.available ? (
                  <Button variant="primary" fullWidth onClick={onSelectClassic}>
                    Select
                  </Button>
                ) : (
                  <Button fullWidth disabled>
                    Coming soon
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
}

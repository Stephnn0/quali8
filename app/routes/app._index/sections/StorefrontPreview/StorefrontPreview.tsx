import {
  Badge,
  BlockStack,
  Card,
  InlineGrid,
  InlineStack,
  Text,
} from "@shopify/polaris";
import styles from "./styles.module.css";

const flower = (from: string, to: string) => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
});

/** Miniature of the "Frequently bought together" theme block. */
function BundleMock() {
  return (
    <div className={styles.mock} aria-hidden="true">
      <p className={styles.mockHeading}>Frequently bought together</p>
      <div className={styles.thumbRow}>
        <div className={styles.thumb} style={flower("#eef4ea", "#d5e3c8")} />
        <span className={styles.plus}>+</span>
        <div className={styles.thumb} style={flower("#f6ecf1", "#e4c8d6")} />
      </div>
      <div className={styles.priceLine}>
        <span>Arctic Beauty</span>
        <span>$199.95</span>
      </div>
      <div className={styles.priceLine}>
        <span>Arctic Luxe</span>
        <span>$324.95</span>
      </div>
      <div className={styles.total}>
        <span>$498.65</span>
        <span className={styles.savings}>Save 5%</span>
      </div>
      <div className={styles.darkButton}>Add bundle to cart</div>
    </div>
  );
}

/** Miniature of the "Smart recommendations" theme block. */
function RecommendationsMock() {
  return (
    <div className={styles.mock} aria-hidden="true">
      <p className={styles.mockHeading}>Find the perfect gift</p>
      <div className={styles.chipRow}>
        <span className={styles.chipLabel}>Occasion</span>
        <span className={`${styles.chip} ${styles.chipActive}`}>
          Mother&rsquo;s Day
        </span>
        <span className={styles.chip}>Birthday</span>
      </div>
      <div className={styles.chipRow}>
        <span className={styles.chipLabel}>Budget</span>
        <span className={styles.chip}>Under $50</span>
        <span className={`${styles.chip} ${styles.chipActive}`}>$50–$100</span>
      </div>
      <div className={styles.cardGrid}>
        <div className={styles.productCard}>
          <div
            className={styles.productImage}
            style={flower("#f2d8e2", "#dba8bd")}
          />
          <span className={styles.reason}>Perfect for Mother&rsquo;s Day</span>
          <span className={styles.productTitle}>Pink Peony Bouquet</span>
          <span className={styles.productPrice}>$68.00</span>
          <div className={styles.miniButton}>Add to cart</div>
        </div>
        <div className={styles.productCard}>
          <div
            className={styles.productImage}
            style={flower("#e6def2", "#b9a4d6")}
          />
          <span className={styles.reason}>Within your budget</span>
          <span className={styles.productTitle}>Lavender Dreams</span>
          <span className={styles.productPrice}>$54.00</span>
          <div className={styles.miniButton}>Add to cart</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Visual previews of the storefront theme blocks so merchants see what
 * shoppers get before opening the theme editor.
 */
export default function StorefrontPreview() {
  return (
    <BlockStack gap="400">
      <BlockStack gap="100">
        <Text as="h2" variant="headingMd">
          On your storefront
        </Text>
        <Text as="p" tone="subdued" variant="bodySm">
          Quali8 ships theme blocks your shoppers see. Add them from the theme
          editor: Online Store → Customize → Add block → Apps.
        </Text>
      </BlockStack>

      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm">
                Bought Together Bundle
              </Text>
              <Badge>Product page</Badge>
            </InlineStack>
            <div className={styles.frame}>
              <BundleMock />
            </div>
            <Text as="p" variant="bodySm" tone="subdued">
              Shows the active bundle for the product being viewed and adds
              the whole set to the cart in one tap — the discount applies
              automatically at checkout.
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm">
                Smart Recommendations
              </Text>
              <InlineStack gap="100">
                <Badge>Product page</Badge>
                <Badge>Cart page</Badge>
              </InlineStack>
            </InlineStack>
            <div className={styles.frame}>
              <RecommendationsMock />
            </div>
            <Text as="p" variant="bodySm" tone="subdued">
              Shoppers pick an occasion, recipient, and budget; the block
              recommends matching products from your Occasions — with the
              reason each pick was chosen.
            </Text>
          </BlockStack>
        </Card>
      </InlineGrid>
    </BlockStack>
  );
}

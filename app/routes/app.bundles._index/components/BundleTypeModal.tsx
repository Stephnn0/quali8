import { Badge, Button, Icon, Modal, type IconSource } from "@shopify/polaris";
import {
  LayoutBlockIcon,
  PackageIcon,
  PlusCircleIcon,
  ProductIcon,
} from "@shopify/polaris-icons";
import styles from "../bundles.module.css";

/**
 * "Which kind of bundle?" — shown when the merchant clicks Create. Only
 * classic bundles exist today; the other types are roadmap teasers.
 */

type BundleTypeModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectClassic: () => void;
};

type BundleTypeCard = {
  key: string;
  title: string;
  icon: IconSource;
  badge?: { label: string; tone: "success" | "info" };
  summary: string;
  available: boolean;
};

const BUNDLE_TYPES: BundleTypeCard[] = [
  {
    key: "classic",
    title: "Classic bundle",
    icon: PackageIcon,
    badge: { label: "Available", tone: "success" },
    summary:
      "Two to four products at a percentage off, shown on the page of every product they include.",
    available: true,
  },
  {
    key: "quantity-breaks",
    title: "Quantity breaks",
    icon: PlusCircleIcon,
    badge: { label: "Coming soon", tone: "info" },
    summary: "Buy more of the same product, save more, with tiered pricing.",
    available: false,
  },
  {
    key: "volume-discount",
    title: "Volume discount",
    icon: ProductIcon,
    badge: { label: "Coming soon", tone: "info" },
    summary: "Bulk savings that grow with the number of items in the cart.",
    available: false,
  },
  {
    key: "mix-match",
    title: "Mix & match",
    icon: LayoutBlockIcon,
    badge: { label: "Coming soon", tone: "info" },
    summary: "Let shoppers build their own box from a pool of products.",
    available: false,
  },
];

export function BundleTypeModal({
  open,
  onClose,
  onSelectClassic,
}: BundleTypeModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Which kind of bundle?" size="large">
      <Modal.Section>
        <div className={styles.typeGrid}>
          {BUNDLE_TYPES.map((type) => (
            <div
              key={type.key}
              className={`${styles.typeTile} ${
                type.available ? styles.typeTileAvailable : styles.typeTileSoon
              }`}
            >
              <div className={styles.typeTop}>
                <span className={styles.typeIcon}>
                  <Icon source={type.icon} />
                </span>
                {type.badge ? (
                  <Badge tone={type.badge.tone}>{type.badge.label}</Badge>
                ) : null}
              </div>
              <h3 className={styles.typeTitle}>{type.title}</h3>
              <p className={styles.typeText}>{type.summary}</p>
              {type.available ? (
                <Button variant="primary" fullWidth onClick={onSelectClassic}>
                  Build a classic bundle
                </Button>
              ) : (
                <Button fullWidth disabled>
                  Coming soon
                </Button>
              )}
            </div>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
}

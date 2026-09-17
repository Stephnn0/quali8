import { useCallback, useState } from "react";
import { useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Layout,
  Modal,
  Page,
  Pagination,
  Text,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, ImageIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { loader } from "./loader";
import { action } from "./action";
import { BundleTypeModal } from "./components/BundleTypeModal";
import { FeatureHeader } from "app/components/OneApp";
import { APP } from "app/constants/app.constants";
import { limitReached } from "app/services/subscriptions/planLimits";
import { computeBundlePricing } from "app/utils/bundlePricing";
import illustration from "app/assets/bundle-card.svg";
import styles from "./bundles.module.css";

export { loader, action };

const money = (value: number) => `$${value.toFixed(2)}`;

export default function Bundles() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const bundles = loaderData?.payload?.bundles ?? [];
  const busy = fetcher.state !== "idle";

  const activeCount = bundles.filter((b) => b.status === "ACTIVE").length;
  const productCount = new Set(
    bundles.flatMap((b) => b.items.map((item) => item.productId)),
  ).size;

  // ==================================== create / delete / status

  const [typeModalActive, setTypeModalActive] = useState(false);
  const openTypeModal = useCallback(() => setTypeModalActive(true), []);
  const closeTypeModal = useCallback(() => setTypeModalActive(false), []);
  const handleSelectClassic = useCallback(() => {
    setTypeModalActive(false);
    navigate("/app/bundles/new");
  }, [navigate]);

  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const closeDelete = useCallback(() => setPendingDelete(null), []);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    fetcher.submit(
      { body: JSON.stringify({ bundleId: pendingDelete.id }) },
      { method: "DELETE", encType: "multipart/form-data" },
    );
    shopify.toast.show("Bundle deleted");
    setPendingDelete(null);
  };

  const toggleStatus = (id: number, status: string) => {
    fetcher.submit(
      {
        body: JSON.stringify({
          bundleId: id,
          status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      },
      { method: "PATCH", encType: "multipart/form-data" },
    );
  };

  // ==================================== pagination

  const [, setSearchParams] = useSearchParams();
  const currentPage = loaderData?.payload?.page ?? 1;
  const totalItems = loaderData?.payload?.total ?? 0;
  const itemsPerPage = loaderData?.payload?.itemsPerPage ?? 15;
  const hasNext = currentPage * itemsPerPage < totalItems;
  const hasPrevious = currentPage > 1;
  const goToPage = (page: number) => setSearchParams({ page: String(page) });

  // ==================================== plan limit (Free: one bundle)

  const bundleLimit = loaderData?.payload?.bundleLimit ?? null;
  const planName = loaderData?.payload?.planName ?? "";
  const atLimit = limitReached(bundleLimit, totalItems);

  return (
    <Page>
      <FeatureHeader
        featureKey="bundle-builder"
        tagline="Frequently-bought-together sets at a discount, shown on the page of every product they include."
        actions={
          <Button variant="primary" onClick={openTypeModal} disabled={atLimit}>
            Create bundle
          </Button>
        }
      />

      <Layout>
        <Layout.Section>
          {bundleLimit !== null ? (
            <div style={{ marginBottom: "1rem" }}>
              {atLimit ? (
                <Banner
                  tone="info"
                  title={`Your ${planName} plan includes ${bundleLimit} ${bundleLimit === 1 ? "bundle" : "bundles"}`}
                  action={{ content: "Upgrade to Advance", onAction: APP.OPEN_APP_PLANS_PAGE }}
                >
                  <p>
                    Edit the one you have, or upgrade for unlimited bundles. Deleting a
                    bundle frees the slot.
                  </p>
                </Banner>
              ) : (
                <BlockStack gap="100">
                  <Text as="p" tone="subdued">
                    {totalItems} of {bundleLimit} {bundleLimit === 1 ? "bundle" : "bundles"} used on
                    the {planName} plan. Advance has no limit.
                  </Text>
                </BlockStack>
              )}
            </div>
          ) : null}
          {bundles.length > 0 ? (
            <>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <p className={styles.statLabel}>Live on storefront</p>
                  <p className={styles.statValue}>{activeCount}</p>
                  <p className={styles.statHint}>
                    {activeCount === 1 ? "bundle is" : "bundles are"} active
                  </p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statLabel}>Inactive</p>
                  <p className={styles.statValue}>
                    {bundles.length - activeCount}
                  </p>
                  <p className={styles.statHint}>hidden until activated</p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statLabel}>Products bundled</p>
                  <p className={styles.statValue}>{productCount}</p>
                  <p className={styles.statHint}>
                    across {bundles.length}{" "}
                    {bundles.length === 1 ? "bundle" : "bundles"}
                  </p>
                </div>
              </div>

              <div className={styles.bundleGrid}>
                {bundles.map((bundle) => {
                  const active = bundle.status === "ACTIVE";
                  const pricing = computeBundlePricing(
                    bundle.items,
                    bundle.discountPercent,
                  );
                  return (
                    <article
                      key={bundle.id}
                      className={`${styles.bundleCard} ${
                        active ? "" : styles.bundleCardInactive
                      }`}
                    >
                      <div className={styles.bundleTop}>
                        {active ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge>Inactive</Badge>
                        )}
                        <span className={styles.savePill}>
                          {bundle.discountPercent}% off
                        </span>
                      </div>
                      <div className={styles.thumbRow}>
                        {bundle.items.map((item, index) => (
                          <span key={item.id} className={styles.thumbRow}>
                            {index > 0 ? (
                              <span className={styles.plus}>+</span>
                            ) : null}
                            {item.imageUrl ? (
                              <img
                                className={styles.thumb}
                                src={item.imageUrl}
                                alt={item.productTitle}
                              />
                            ) : (
                              <span
                                className={`${styles.thumb} ${styles.thumbEmpty}`}
                              >
                                <ImageIcon width={20} height={20} />
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                      <div>
                        <h3 className={styles.bundleTitle}>{bundle.title}</h3>
                        <p className={styles.bundleProducts}>
                          {bundle.items.map((item) => item.productTitle).join(" + ")}
                        </p>
                      </div>
                      <div className={styles.priceRow}>
                        <span className={styles.priceWas}>
                          {money(pricing.originalTotal)}
                        </span>
                        <span className={styles.priceNow}>
                          {money(pricing.finalTotal)}
                        </span>
                      </div>
                      <div className={styles.cardActions}>
                        <Button
                          size="slim"
                          onClick={() => toggleStatus(bundle.id, bundle.status)}
                          disabled={busy}
                        >
                          {active ? "Deactivate" : "Activate"}
                        </Button>
                        <ButtonGroup>
                          <Button
                            size="slim"
                            icon={EditIcon}
                            accessibilityLabel="Edit bundle"
                            onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                          />
                          <Button
                            size="slim"
                            icon={DeleteIcon}
                            accessibilityLabel="Delete bundle"
                            onClick={() =>
                              setPendingDelete({ id: bundle.id, title: bundle.title })
                            }
                          />
                        </ButtonGroup>
                      </div>
                    </article>
                  );
                })}
              </div>

              {hasNext || hasPrevious ? (
                <div className={styles.pager}>
                  <Pagination
                    hasNext={hasNext}
                    hasPrevious={hasPrevious}
                    onNext={() => goToPage(currentPage + 1)}
                    onPrevious={() => goToPage(currentPage - 1)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <section className={styles.empty}>
              <img
                className={styles.emptyArt}
                src={illustration}
                alt=""
                width={800}
                height={520}
              />
              <div>
                <p className={styles.emptyEyebrow}>Bundle Builder</p>
                <h2 className={styles.emptyTitle}>
                  Turn products that sell together into one offer
                </h2>
                <p className={styles.emptyText}>
                  A bundle groups two to four products at a percentage off.
                  Shoppers add the whole set in one click, and the discount is
                  applied automatically at checkout.
                </p>
                <ol className={styles.steps}>
                  <li className={styles.step}>
                    <span className={styles.stepNumber}>1</span>
                    <div>
                      <p className={styles.stepTitle}>Pick the products</p>
                      <p className={styles.stepText}>
                        Choose two to four products that go well together.
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepNumber}>2</span>
                    <div>
                      <p className={styles.stepTitle}>Set the discount</p>
                      <p className={styles.stepText}>
                        A percentage off the combined price, with a live
                        preview of what shoppers see.
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepNumber}>3</span>
                    <div>
                      <p className={styles.stepTitle}>Activate it</p>
                      <p className={styles.stepText}>
                        The bundle appears on every included product's page
                        once the app block is in your theme.
                      </p>
                    </div>
                  </li>
                </ol>
                <div className={styles.emptyActions}>
                  <Button variant="primary" onClick={openTypeModal} disabled={atLimit}>
                    Create bundle
                  </Button>
                </div>
              </div>
            </section>
          )}
        </Layout.Section>
      </Layout>

      <BundleTypeModal
        open={typeModalActive}
        onClose={closeTypeModal}
        onSelectClassic={handleSelectClassic}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={closeDelete}
        title={`Delete “${pendingDelete?.title ?? ""}”?`}
        primaryAction={{
          content: "Delete bundle",
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[{ content: "Cancel", onAction: closeDelete }]}
      >
        <Modal.Section>
          <p>
            The bundle disappears from your storefront right away and its
            discount stops applying. This cannot be undone.
          </p>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

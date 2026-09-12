import { Link, useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  IndexTable,
  Layout,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { loader } from "./loader";
import { FeatureHeader } from "app/components/OneApp";
import illustration from "app/assets/shipping-card.svg";
import styles from "../app.actions.discounts/smartShipping.module.css";

export { loader };

const WALKTHROUGH_URL = "https://www.youtube.com/watch?v=JoejVhoby0s";

const shortDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
};

export default function AllActions() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const discounts =
    loaderData?.payload?.discounts.shippingDiscountActions ?? [];

  const activeCount = discounts.filter(
    (d) => d.shippingDiscountState === "ENABLED",
  ).length;
  const codeCount = discounts.filter((d) => d.automaticOrCode === "CODE").length;

  // ==================================== delete

  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    shopifyDiscountId: string;
    automaticOrCode: string;
    name: string;
  } | null>(null);

  const closeDelete = useCallback(() => setPendingDelete(null), []);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    fetcher.submit(
      {
        body: JSON.stringify({
          shippingDiscountId: pendingDelete.id,
          shopifyDiscountId: pendingDelete.shopifyDiscountId,
          automaticOrCode: pendingDelete.automaticOrCode,
        }),
      },
      {
        method: "DELETE",
        encType: "multipart/form-data",
        action: "/api/deleteDiscount",
      },
    );
    shopify.toast.show("Shipping discount deleted");
    setPendingDelete(null);
  };

  // ==================================== pagination

  const [, setSearchParams] = useSearchParams();
  const currentPage = loaderData?.payload?.page ?? 1;
  const totalItems = loaderData?.payload?.total ?? 0;
  const itemsPerPage = loaderData?.payload?.itemsPerPage ?? 15;
  const hasNext = currentPage * itemsPerPage < totalItems;
  const hasPrevious = currentPage > 1;
  const goToPage = (page: number) => setSearchParams({ page: String(page) });

  // ==================================== rows

  const rowMarkup = discounts.map((discount, index) => {
    const isCode = discount.automaticOrCode === "CODE";
    const audiences = discount.appliesToAllCustomers
      ? "All customers"
      : `${discount.qualifierIds.length} audience${
          discount.qualifierIds.length === 1 ? "" : "s"
        }`;
    const rates =
      discount.shippingRateType === "ALL_RATES"
        ? "All rates"
        : `${discount.shippingRatesNames.length} selected`;
    const start = shortDate(discount.startDate);
    const end = discount.hasEndDate ? shortDate(discount.endDate) : null;
    const schedule = start
      ? end
        ? `${start} → ${end}`
        : `From ${start}`
      : "—";

    return (
      <IndexTable.Row
        id={String(discount.id)}
        key={discount.id}
        position={index}
      >
        <IndexTable.Cell>
          <div className={styles.rowTitle}>
            <span className={styles.rowName}>{discount.codeOrName}</span>
            <span className={isCode ? styles.rowCode : styles.rowMeta}>
              {isCode ? "Discount code" : "Automatic"}
            </span>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {discount.type === "percentage"
              ? discount.value >= 100
                ? "Free shipping"
                : `${discount.value}% off`
              : `$${discount.value} off`}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {audiences}
          </Text>
          {discount.isMinimumCartValueEnabled ? (
            <div className={styles.rowMeta}>
              Cart over ${discount.minimumCartValue}
            </div>
          ) : null}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {rates}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {schedule}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {discount.shippingDiscountState === "ENABLED" ? (
            <Badge tone="success">On</Badge>
          ) : (
            <Badge>Off</Badge>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Link to={`/app/actions/discounts/${discount.id}`}>
              <Button icon={EditIcon} accessibilityLabel="Edit" />
            </Link>
            <Button
              icon={DeleteIcon}
              accessibilityLabel="Delete"
              onClick={() =>
                setPendingDelete({
                  id: discount.id,
                  shopifyDiscountId: discount.shopifyDiscountId,
                  automaticOrCode: discount.automaticOrCode,
                  name: discount.codeOrName,
                })
              }
            />
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page>
      <FeatureHeader
        featureKey="smart-shipping"
        tagline="Free or discounted shipping for the customers you choose, applied automatically at checkout."
        actions={
          <Button variant="primary" onClick={() => navigate("new")}>
            Create shipping discount
          </Button>
        }
      />

      <Layout>
        <Layout.Section>
          {discounts.length > 0 ? (
            <>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <p className={styles.statLabel}>Live now</p>
                  <p className={styles.statValue}>{activeCount}</p>
                  <p className={styles.statHint}>
                    {activeCount === 1 ? "discount is" : "discounts are"} on
                  </p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statLabel}>Turned off</p>
                  <p className={styles.statValue}>
                    {discounts.length - activeCount}
                  </p>
                  <p className={styles.statHint}>paused, ready to enable</p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statLabel}>Discount codes</p>
                  <p className={styles.statValue}>{codeCount}</p>
                  <p className={styles.statHint}>
                    {discounts.length - codeCount} automatic
                  </p>
                </div>
              </div>

              <Card padding="0">
                <IndexTable
                  resourceName={{
                    singular: "shipping discount",
                    plural: "shipping discounts",
                  }}
                  itemCount={discounts.length}
                  selectable={false}
                  headings={[
                    { title: "Discount" },
                    { title: "Value" },
                    { title: "Who qualifies" },
                    { title: "Rates" },
                    { title: "Schedule" },
                    { title: "Status" },
                    { title: "Actions" },
                  ]}
                  pagination={{
                    hasNext,
                    hasPrevious,
                    onNext: () => goToPage(currentPage + 1),
                    onPrevious: () => goToPage(currentPage - 1),
                  }}
                >
                  {rowMarkup}
                </IndexTable>
              </Card>
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
                <p className={styles.emptyEyebrow}>Smart Shipping</p>
                <h2 className={styles.emptyTitle}>
                  Your first shipping discount takes three steps
                </h2>
                <p className={styles.emptyText}>
                  Reward the customers you choose with cheaper or free
                  shipping. Shopify applies it at checkout, no code changes
                  needed.
                </p>
                <ol className={styles.steps}>
                  <li className={styles.step}>
                    <span className={styles.stepNumber}>1</span>
                    <div>
                      <p className={styles.stepTitle}>Pick who qualifies</p>
                      <p className={styles.stepText}>
                        Everyone, or an audience from Customer Insights such
                        as VIPs or repeat buyers.
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepNumber}>2</span>
                    <div>
                      <p className={styles.stepTitle}>Set the discount</p>
                      <p className={styles.stepText}>
                        A percentage or a fixed amount, as a code or applied
                        automatically.
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepNumber}>3</span>
                    <div>
                      <p className={styles.stepTitle}>Choose the rates</p>
                      <p className={styles.stepText}>
                        Discount every shipping rate or only the ones you
                        select, with an optional schedule.
                      </p>
                    </div>
                  </li>
                </ol>
                <div className={styles.emptyActions}>
                  <Button
                    variant="primary"
                    onClick={() => navigate("/app/actions/discounts/new")}
                  >
                    Create shipping discount
                  </Button>
                  <Button
                    variant="plain"
                    url={WALKTHROUGH_URL}
                    target="_blank"
                  >
                    Watch the walkthrough
                  </Button>
                </div>
              </div>
            </section>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={pendingDelete !== null}
        onClose={closeDelete}
        title={`Delete “${pendingDelete?.name ?? ""}”?`}
        primaryAction={{
          content: "Delete discount",
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[{ content: "Cancel", onAction: closeDelete }]}
      >
        <Modal.Section>
          <p>
            The discount is removed from Shopify right away and customers
            stop receiving it at checkout. This cannot be undone.
          </p>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

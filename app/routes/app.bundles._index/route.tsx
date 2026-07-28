import { useCallback, useState } from "react";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  IndexTable,
  Layout,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { loader } from "./loader";
import { action } from "./action";
import { BundleTypeModal } from "./components/BundleTypeModal";

export { loader, action };

export default function Bundles() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const bundles = loaderData?.payload?.bundles ?? [];

  const [modalActive, setModalActive] = useState(false);
  const [typeModalActive, setTypeModalActive] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);

  const handleModalChange = useCallback(
    () => setModalActive((prev) => !prev),
    [],
  );

  const openTypeModal = useCallback(() => setTypeModalActive(true), []);
  const closeTypeModal = useCallback(() => setTypeModalActive(false), []);
  const handleSelectClassic = useCallback(() => {
    setTypeModalActive(false);
    navigate("/app/bundles/new");
  }, [navigate]);

  const handleDeleteClick = (id: number) => {
    setSelectedBundleId(id);
    setModalActive(true);
  };

  const handleDeleteConfirm = () => {
    setModalActive(false);
    if (selectedBundleId === null) return;

    fetcher.submit(
      { body: JSON.stringify({ bundleId: selectedBundleId }) },
      { method: "DELETE", encType: "multipart/form-data" },
    );
    shopify.toast.show("Bundle deleted");
  };

  const handleToggleStatus = (id: number, status: string) => {
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

  const resourceName = {
    singular: "Bundle",
    plural: "Bundles",
  };

  const rowMarkup = bundles.map((bundle, index) => (
    <IndexTable.Row id={String(bundle.id)} key={bundle.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {bundle.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {bundle.items.map((item) => item.productTitle).join(", ")}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {bundle.discountPercent}% off
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {bundle.status === "ACTIVE" ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge>Inactive</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            onClick={() => handleToggleStatus(bundle.id, bundle.status)}
            disabled={fetcher.state !== "idle"}
          >
            {bundle.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
          <Link to={`/app/bundles/${bundle.id}`}>
            <Button icon={EditIcon}></Button>
          </Link>
          <Button
            icon={DeleteIcon}
            onClick={() => handleDeleteClick(bundle.id)}
          ></Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // ==================================== pagination

  const [, setSearchParams] = useSearchParams();

  const currentPage = loaderData?.payload?.page || 1;
  const totalItems = loaderData?.payload?.total ?? 0;
  const itemsPerPage = loaderData?.payload?.itemsPerPage ?? 15;
  const hasNext = currentPage * itemsPerPage < totalItems;
  const hasPrevious = currentPage > 1;

  const goToPage = (page: number) => {
    setSearchParams({ page: page.toString() });
  };

  return (
    <Page
      title="Product Bundles"
      subtitle="Discounted product bundles shown on product pages"
      primaryAction={
        <Button variant="primary" onClick={openTypeModal}>
          Create
        </Button>
      }
    >
      <Layout>
        <Layout.Section>
          {bundles.length > 0 ? (
            <Card>
              <IndexTable
                resourceName={resourceName}
                itemCount={bundles.length}
                selectable={false}
                headings={[
                  { title: "Title" },
                  { title: "Products" },
                  { title: "Discount" },
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
          ) : (
            <Card>
              <EmptyState
                heading="You have no bundles yet"
                image=""
                action={{
                  content: "Create bundle",
                  onAction: openTypeModal,
                }}
                fullWidth
              >
                <p>
                  Bundles let you offer a percentage discount when shoppers buy
                  a set of products together. They appear on the included
                  products' pages once you add the app block to your theme.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>
      <BundleTypeModal
        open={typeModalActive}
        onClose={closeTypeModal}
        onSelectClassic={handleSelectClassic}
      />
      <Modal
        open={modalActive}
        onClose={handleModalChange}
        title="Are you sure you want to delete this bundle?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDeleteConfirm,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalChange,
          },
        ]}
      >
        <Modal.Section>
          <p>
            This action cannot be undone. The bundle will stop showing on the
            storefront immediately.
          </p>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

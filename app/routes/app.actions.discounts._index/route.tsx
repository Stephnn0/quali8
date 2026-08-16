import { Link, useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import {
  IndexTable,
  Page,
  useIndexResourceState,
  Card,
  Button,
  ButtonGroup,
  TextContainer,
  Modal,
  Layout,
  MediaCard,
  Badge,
  FooterHelp,
  EmptyState,
} from "@shopify/polaris";
import { loader } from "./loader";

import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import image from "app/assets/sds.png";
import { useAppBridge } from "@shopify/app-bridge-react";
import quailifierlogo from "app/assets/disco.png";
import { FeatureHeader } from "app/components/OneApp";
export { loader };

export default function AllActions() {
  const loaderData = useLoaderData<typeof loader>();

  // ! refactor in the future since we will have more types of actions
  const discountActions =
    loaderData?.payload?.discounts.shippingDiscountActions.map((data) => ({
      id: data.id,
      codeOrName: data.codeOrName,
      type: data.type,
      discountMethod: data.automaticOrCode,
      value: data.value,
      shopifyDiscountId: data.shopifyDiscountId,
      //
      automaticOrCode: data.automaticOrCode,
      //
      shippingDiscountState: data.shippingDiscountState,
    })) || [];

  const resourceName = {
    singular: "Discount Action",
    plural: "Discount Actions",
  };
  const { selectedResources, allResourcesSelected } =
    useIndexResourceState(discountActions);

  const rowMarkup = discountActions?.map(
    (
      {
        id,
        codeOrName,
        type,
        discountMethod,
        value,
        shopifyDiscountId,
        automaticOrCode,
        shippingDiscountState,
      },
      index,
    ) => (
      <IndexTable.Row
        id={String(id)}
        key={id}
        selected={selectedResources.includes(String(id))}
        position={index}
      >
        <IndexTable.Cell>
          <Badge
            tone={shippingDiscountState === "ENABLED" ? "success" : "critical"}
          >
            {shippingDiscountState}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{codeOrName}</IndexTable.Cell>
        <IndexTable.Cell>{type}</IndexTable.Cell>
        <IndexTable.Cell>{discountMethod}</IndexTable.Cell>
        <IndexTable.Cell>
          {type === "percentage" ? `${value}%` : `$${value}`}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Link to={`/app/actions/discounts/${id}`}>
              <Button icon={EditIcon}></Button>
            </Link>
            <Button
              onClick={() =>
                handleDeleteClick(id, shopifyDiscountId, automaticOrCode)
              }
              icon={DeleteIcon}
            ></Button>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const [selectedShippingDiscount, setSelectedShippingDiscount] = useState<{
    id: number;
    shopifyDiscountId: string;
    automaticOrCode: string;
  } | null>(null);

  const [modalActive, setModalActive] = useState(false);

  const handleModalChange = useCallback(
    () => setModalActive((prev) => !prev),
    [],
  );

  const handleDeleteClick = (
    id: number,
    shopifyDiscountId: string,
    automaticOrCode: string,
  ) => {
    setSelectedShippingDiscount({
      id,
      shopifyDiscountId,
      automaticOrCode,
    });
    setModalActive(true);
  };

  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const handleDeleteConfirm = () => {
    setModalActive(false);

    if (!selectedShippingDiscount) return;
    try {
      const body = {
        shippingDiscountId: selectedShippingDiscount.id,
        shopifyDiscountId: selectedShippingDiscount.shopifyDiscountId,
        automaticOrCode: selectedShippingDiscount.automaticOrCode,
      };
      fetcher.submit(
        {
          body: JSON.stringify(body),
        },
        {
          method: "DELETE",
          encType: "multipart/form-data",
          action: `/api/deleteDiscount`,
        },
      );
      shopify.toast.show("Discount deleted");
    } catch (error) {
      console.log("Error deleting qualifier", error);
    }
  };
  const navigate = useNavigate();

  // ==================================== pagination

  const [, setSearchParams] = useSearchParams();

  const currentPage = loaderData?.payload?.page || 1;
  const totalItems = loaderData?.payload?.total;
  const itemsPerPage = loaderData?.payload?.itemsPerPage;
  const hasNext = currentPage * itemsPerPage! < totalItems!;
  const hasPrevious = currentPage > 1;

  const goToPage = (page: number) => {
    setSearchParams({ page: page.toString() });
  };

  return (
    <Page>
      <FeatureHeader
        featureKey="smart-shipping"
        actions={
          <Button variant="primary" onClick={() => navigate("new")}>
            Create shipping discount
          </Button>
        }
      />
      <Layout>
        <Layout.Section>
          <MediaCard
            title="Getting Started with Shipping Discounts?"
            primaryAction={{
              content: "Learn about getting started",
              onAction: () => {
                window.open(
                  "https://www.youtube.com/watch?v=JoejVhoby0s",
                  "_blank",
                );
              },
            }}
            description="Watch this video to learn how to get started with Shipping Discounts."
          >
            <img
              alt=""
              width="100%"
              height="100%"
              style={{
                objectFit: "cover",
                objectPosition: "center",
              }}
              src={image}
            />
          </MediaCard>
        </Layout.Section>
        <Layout.Section>
          {discountActions.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={resourceName}
                itemCount={discountActions!.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                // onSelectionChange={handleSelectionChange}
                selectable={false}
                headings={[
                  { title: "Status" },
                  { title: "Code" },
                  { title: "Type" },
                  { title: "Discount Method" },
                  { title: "Value" },
                  { title: "Actions" }, // 🔧 New Column
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
                heading="No shipping discounts yet"
                image={quailifierlogo}
                action={{
                  content: "Create shipping discount",
                  onAction: () => {
                    navigate("/app/actions/discounts/new");
                  },
                }}
                fullWidth
              >
                <p>
                  Reward the audiences you choose with discounted shipping —
                  percentage or fixed, automatic or code-based.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
        <Layout.Section>
          <FooterHelp>© 8Instruments. All rights reserved.</FooterHelp>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalActive}
        onClose={handleModalChange}
        title="Are you sure you want to delete this Shipping Discount?"
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
          <TextContainer>
            <p>
              This action cannot be undone. Are you sure you want to delete this
              Shipping Discount?
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

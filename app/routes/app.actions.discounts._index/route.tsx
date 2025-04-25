import { Link, useLoaderData, useSubmit } from "@remix-run/react";
import {
  IndexTable,
  Page,
  useIndexResourceState,
  Text,
  Card,
  Button,
  ButtonGroup,
  TextContainer,
  Modal,
  Layout,
  MediaCard,
  Badge,
  FooterHelp,
} from "@shopify/polaris";
import { loader } from "./loader";
import { action } from "./action";

import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import image from "app/assets/sds.png";
import { useAppBridge } from "@shopify/app-bridge-react";

export { loader, action };

export default function AllActions() {
  const loaderData = useLoaderData<typeof loader>();

  console.log(loaderData, "loaderData");

  // ! refactor in the future since we will have more types of actions
  const discountActions =
    loaderData?.payload?.map((data) => ({
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

  const submit = useSubmit();

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
        <IndexTable.Cell> {type}</IndexTable.Cell>
        <IndexTable.Cell> {discountMethod}</IndexTable.Cell>
        <IndexTable.Cell>
          <IndexTable.Cell>
            {type === "percentage" ? `${value}%` : `$${value}`}
          </IndexTable.Cell>
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

  const handleDeleteConfirm = () => {
    setModalActive(false);

    if (!selectedShippingDiscount) return;
    try {
      const body = {
        shippingDiscountId: selectedShippingDiscount.id,
        shopifyDiscountId: selectedShippingDiscount.shopifyDiscountId,
        automaticOrCode: selectedShippingDiscount.automaticOrCode,
      };
      submit(
        {
          body: JSON.stringify(body),
        },
        {
          method: "DELETE",
          encType: "multipart/form-data",
          action: `/app/actions/discounts`,
        },
      );
      shopify.toast.show("Discount deleted");
    } catch (error) {
      console.log("Error deleting qualifier", error);
    }
  };

  return (
    <Page
      backAction={{ url: "/app/actions" }}
      title="My Actions"
      primaryAction={
        <Link to="new">
          <Button variant="primary">Create Shipping Discount</Button>
        </Link>
      }
    >
      <Layout>
        <Layout.Section>
          <MediaCard
            title="Getting Started with Shipping Discounts?"
            primaryAction={{
              content: "Learn about getting started",
              onAction: () => {},
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
          <Card>
            <Text variant="headingMd" as="h4">
              Shipping Discounts
            </Text>
            <br />

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
                hasNext: true,
                onNext: () => {},
              }}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <FooterHelp>All rights reserved. 8Instruments</FooterHelp>
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

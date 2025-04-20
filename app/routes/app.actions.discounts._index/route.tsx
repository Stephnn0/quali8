import { Link, useLoaderData, useSubmit } from "@remix-run/react";
import {
  IndexTable,
  Page,
  useIndexResourceState,
  Text,
  Card,
  Button,
  ButtonGroup,
} from "@shopify/polaris";
import { loader } from "./loader";
import { action } from "./action";

import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";

export { loader, action };

export default function AllActions() {
  const loaderData = useLoaderData<typeof loader>();

  // ! refactor in the future since we will have more types of actions
  const discountActions =
    loaderData?.payload?.map((data) => ({
      id: data.id,
      codeOrName: data.codeOrName,
      type: data.type,
      discountMethod: data.automaticOrCode,
      value: data.value,
      shopifyDiscountId: data.shopifyDiscountId,
      marketingActionId: data.marketingActionId,
      //
      automaticOrCode: data.automaticOrCode,
    })) || [];

  const resourceName = {
    singular: "Discount Action",
    plural: "Discount Actions",
  };
  const { selectedResources, allResourcesSelected } =
    useIndexResourceState(discountActions);

  const submit = useSubmit();

  const handleDelete = (
    actionId: string,
    shopifyDiscountId: string,
    marketingActionId: string,
    automaticOrCode: string,
  ) => {
    const body = {
      shippingDiscountId: actionId,
      shopifyDiscountId: shopifyDiscountId,
      marketingActionId: marketingActionId,
      automaticOrCode: automaticOrCode,
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
  };

  const rowMarkup = discountActions?.map(
    (
      {
        id,
        codeOrName,
        type,
        discountMethod,
        value,
        shopifyDiscountId,
        marketingActionId,
        automaticOrCode,
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
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {" "}
            DRAFT
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {" "}
            {codeOrName}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {" "}
            {type}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {" "}
            {discountMethod}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              {type === "percentage" ? `${value}%` : `$${value}`}
            </Text>
          </IndexTable.Cell>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Link to={`/app/actions/${id}/edit`}>
              <Button icon={EditIcon}></Button>
            </Link>
            <Button
              onClick={() =>
                handleDelete(
                  id,
                  shopifyDiscountId,
                  marketingActionId,
                  automaticOrCode,
                )
              }
              icon={DeleteIcon}
            ></Button>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      backAction={{ url: "/app/actions" }}
      title="My Actions"
      primaryAction={
        <Link to="new">
          <Button>Create Shipping Discount</Button>
        </Link>
      }
    >
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
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}

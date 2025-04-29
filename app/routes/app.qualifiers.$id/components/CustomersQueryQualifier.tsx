import {
  Button,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Spinner,
} from "@shopify/polaris";
import type { CustomerSegment, QualifierForm } from "../hooks";
import { Form } from "@remix-run/react";
import { useEffect, useState } from "react";

import type action from "../../api.shopifyCustomers/action";
import type { FilterCustomersForm } from "../hooks/filterCustomers";

export { action };

type CustomersQueryQualifierProps = {
  form: QualifierForm;
  formFilterCustomers: FilterCustomersForm;
};

export default function CustomersQueryQualifier({
  form,
  formFilterCustomers,
}: CustomersQueryQualifierProps) {
  const { fetcher } = formFilterCustomers;

  const { fields } = form;
  const { customers, formConditions } = fields;

  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>(
    customers.value || [],
  );

  useEffect(() => {
    if (fetcher.data?.payload) {
      console.log("fetcher.data.payload", fetcher.data.payload);
      const customersRefactor = fetcher.data.payload.map(({ node }: any) => ({
        shopifyId: node.id,
        firstName: node.firstName ?? "",
        lastName: node.lastName ?? "",
        createdAt: node.createdAt,
        country: node.addresses?.[0]?.country ?? "N/A",
        amountSpent: node.amountSpent?.amount ?? "0.0",
        orderCount: node.orders?.edges?.length ?? 0,
      }));

      setCustomerSegments(customersRefactor);
      customers.value = customersRefactor;
    } else if (customers.value?.length > 0) {
      setCustomerSegments(customers.value); // 👈 fallback to initial value
    } else {
      setCustomerSegments([]);
    }
  }, [customers, fetcher.data]);

  const resourceName = {
    singular: "customer",
    plural: "customers",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(customerSegments);

  const rowMarkup = customerSegments?.map(
    ({ shopifyId, firstName, country, amountSpent, orderCount }, index) => (
      <IndexTable.Row
        id={shopifyId}
        key={shopifyId}
        selected={selectedResources.includes(shopifyId)}
        position={index}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {firstName}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{country}</IndexTable.Cell>
        <IndexTable.Cell>${amountSpent}</IndexTable.Cell>
        <IndexTable.Cell>{orderCount}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Card>
      {fetcher.state === "loading" ||
        (fetcher.state === "submitting" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "5px",
              alignItems: "center",
              paddingTop: "15px",
            }}
          >
            <Spinner accessibilityLabel="Spinner example" size="large" />
            <Text variant="headingSm" as="h6">
              loading customers...
            </Text>
          </div>
        ) : (
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={customerSegments?.length || 0}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Name" },
                { title: "Country" },
                { title: "Amount Spent" },
                { title: "Orders" },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        ))}

      <br />

      <Form onSubmit={formFilterCustomers.submit}>
        <Button disabled={formConditions.value.length === 0} submit>
          {fetcher.state === "submitting" ? "...loading" : "Run Query"}
        </Button>
      </Form>
    </Card>
  );
}

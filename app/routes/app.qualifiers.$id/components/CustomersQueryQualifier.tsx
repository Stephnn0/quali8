import {
  Button,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
} from "@shopify/polaris";
import type { QualifierForm } from "../hooks";
import { Form } from "@remix-run/react";
import { useEffect, useState } from "react";

import type action from "../../api.shopifyCustomers/action";
import type { FilterCustomersForm } from "../hooks/filterCustomers";

export { action };

type CustomersQueryQualifierProps = {
  form: QualifierForm;
  formFilterCustomers: FilterCustomersForm;
};
type CustomerSegment = {
  shopifyId: string;
  firstName: string;
};

export default function CustomersQueryQualifier({
  form,
  formFilterCustomers,
}: CustomersQueryQualifierProps) {
  const { fetcher } = formFilterCustomers;

  const { fields } = form;
  const { customers, formConditions } = fields;

  console.log("--------------", customers.value);

  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>(
    customers.value || [],
  );

  useEffect(() => {
    if (fetcher.data?.payload) {
      const customersRefactor = fetcher.data.payload.map(({ node }: any) => ({
        shopifyId: node.id,
        firstName: node.firstName ?? "",
        lastName: node.lastName ?? "",
        createdAt: node.createdAt,
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

  const rowMarkup = customerSegments?.map(({ shopifyId, firstName }, index) => (
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
    </IndexTable.Row>
  ));

  return (
    <Card>
      <Card>
        <IndexTable
          resourceName={resourceName}
          itemCount={customerSegments?.length || 0}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[{ title: "Name" }]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>

      <br />

      <Form onSubmit={formFilterCustomers.submit}>
        <Button disabled={formConditions.value.length === 0} submit>
          {fetcher.state === "submitting" ? "...loading" : "Run Query"}
        </Button>
      </Form>
    </Card>
  );
}

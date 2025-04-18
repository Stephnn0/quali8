import {
  Button,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
} from "@shopify/polaris";
import type { QualifierForm } from "../hooks";
import { Form, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";

import type action from "../../api.shopifyCustomers/action";

export { action };

type CustomersQueryQualifierProps = {
  form: QualifierForm;
};
type CustomerSegment = {
  id: string;
  firstName: string;
};

export default function CustomersQueryQualifier({
  form,
}: CustomersQueryQualifierProps) {
  const fetcher = useFetcher<typeof action>();

  const { fields } = form;

  const { customers } = fields;

  useEffect(() => {
    if (fetcher.data?.payload) {
      const customersRefactor = fetcher.data.payload.map(({ node }) => ({
        id: node.id,
        firstName: node.firstName ?? "",
        lastName: node.lastName ?? "",
        createdAt: node.createdAt,
      }));

      setCustomerSegments(customersRefactor);
      customers.value = customersRefactor;
    } else {
      setCustomerSegments([]);
    }
  }, [customers, fetcher.data]);

  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>(
    [],
  );

  const resourceName = {
    singular: "customer",
    plural: "customers",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(customerSegments);

  const handleSubmit = () => {
    try {
      fetcher.submit(
        {},
        {
          method: "post",
          action: "/api/shopifyCustomers",
          encType: "multipart/form-data",
        },
      );
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const rowMarkup = customerSegments?.map(({ id, firstName }, index) => (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selectedResources.includes(id)}
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

      <Form onSubmit={handleSubmit}>
        <Button submit>Run Query</Button>
      </Form>
    </Card>
  );
}

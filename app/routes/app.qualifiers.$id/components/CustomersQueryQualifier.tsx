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
  id: string;
  firstName: string;
};

export default function CustomersQueryQualifier({
  form,
  formFilterCustomers,
}: CustomersQueryQualifierProps) {
  const { fetcher } = formFilterCustomers;

  const { fields } = form;
  const { customers } = fields;

  useEffect(() => {
    if (fetcher.data?.payload) {
      const customersRefactor = fetcher.data.payload.map(({ node }: any) => ({
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

      <Form onSubmit={formFilterCustomers.submit}>
        <Button
          //  disabled={!formFilterCustomers.dirty}
          submit
        >
          {fetcher.state === "submitting" ? "...loading" : "Run Query"}
        </Button>
      </Form>
    </Card>
  );
}

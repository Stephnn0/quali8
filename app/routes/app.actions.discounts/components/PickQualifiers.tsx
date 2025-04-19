import {
  Card,
  IndexTable,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import type { DiscountForm } from "../hooks";
import { useEffect } from "react";

type PickQualifiersProps = {
  mockQualifiers: any;
  form: DiscountForm;
};

type Qualifier = {
  id: string;
  name: string;
  customers: string[];
};

export function PickQualifiers({ mockQualifiers, form }: PickQualifiersProps) {
  const { fields } = form;

  const { customers } = fields;

  const customerSegments = mockQualifiers.map(
    (qualifier: Qualifier, index: any) => ({
      id: qualifier.id,
      name: qualifier.name,
      customers: qualifier.customers, // Just use the array of IDs directly
    }),
  );

  const resourceName = {
    singular: "qualifier",
    plural: "qualifiers",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(customerSegments);

  const rowMarkup = customerSegments?.map(({ id, name }: any, index: any) => (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selectedResources.includes(id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {name}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  useEffect(() => {
    const selectedCustomers = customerSegments
      .filter((segment: any) => selectedResources.includes(segment.id))
      .flatMap((segment: any) => segment.customers);

    console.log(selectedCustomers, "selectedCustomers");

    customers.value = selectedCustomers;

    // Update the 'customers' field in the form with the selected customers
  }, [selectedResources, customerSegments, customers]);

  return (
    <Card>
      <p>Pick Qualifier Group</p>
      <br />
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
  );
}

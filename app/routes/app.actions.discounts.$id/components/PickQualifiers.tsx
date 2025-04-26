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
  id: number;
  name: string;
  customers: string[];
};

export function PickQualifiers({ mockQualifiers, form }: PickQualifiersProps) {
  const { fields } = form;

  const { customers, qualifierIds } = fields;

  const qualifiers = mockQualifiers.map((qualifier: Qualifier) => ({
    id: qualifier.id,
    name: qualifier.name,
    customers: qualifier.customers, // Just use the array of IDs directly
  }));

  const resourceName = {
    singular: "qualifier",
    plural: "qualifiers",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(qualifiers, {
      selectedResources: qualifierIds.value as unknown as string[], // ! DANGEROUS 'as' FIX LATER
    });

  const rowMarkup = qualifiers?.map(({ id, name }: any, index: any) => (
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
    const selectedQualifier = qualifiers.filter((qualifier: any) =>
      selectedResources.includes(qualifier.id),
    );

    const selectedCustomers = selectedQualifier.flatMap(
      (qualifier: any) => qualifier.customers,
    );

    const selectedQualifierIds = selectedQualifier.map(
      (qualifier: any) => qualifier.id,
    );

    customers.value = selectedCustomers;
    qualifierIds.value = selectedQualifierIds;
  }, [selectedResources, qualifiers, customers, qualifierIds]);

  return (
    <Card>
      <Text variant="bodyMd" as="p" fontWeight="bold">
        Pick Qualifier Group
      </Text>
      <br />
      <Text variant="bodyMd" as="p">
        Select the customer segments that will be used to qualify for this
      </Text>

      <br />
      <IndexTable
        resourceName={resourceName}
        itemCount={qualifiers?.length || 0}
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

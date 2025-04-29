import {
  Badge,
  Button,
  Card,
  EmptyState,
  IndexTable,
  Modal,
  Text,
  TextContainer,
  useIndexResourceState,
} from "@shopify/polaris";
import type { DiscountForm } from "../hooks";
import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import quailifierlogo from "app/assets/qualifier-logo.png";

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

  console.log("Qualifiers: ", qualifiers);

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

    console.log("Selected Customers: ", selectedCustomers);
    console.log("Selected Qualifier IDs: ", selectedQualifierIds);

    // customers.value = selectedCustomers;
    // qualifierIds.value = selectedQualifierIds;
    customers.onChange(selectedCustomers);
    qualifierIds.onChange(selectedQualifierIds);

    if (selectedQualifierIds.length > 0) {
    }
  }, [selectedResources]);

  const navigate = useNavigate();

  // ========================================================================== //
  const selectedQualifiersDisplay = qualifiers
    .filter((q) => selectedResources.includes(q.id))
    .map((q) => <Badge key={q.id}>{q.name}</Badge>);

  const [modalActive, setModalActive] = useState(false);
  const [temporarySelected, setTemporarySelected] = useState<string[]>([]);

  const handleModalClose = () => {
    const selectedQualifier = qualifiers.filter((q) =>
      temporarySelected.includes(q.id),
    );

    const selectedCustomers = selectedQualifier.flatMap((q) => q.customers);
    const selectedQualifierIds = selectedQualifier.map((q) => q.id);

    customers.onChange(selectedCustomers);
    qualifierIds.onChange(selectedQualifierIds);

    // ! FIX LATER
    // handleSelectionChange(temporarySelected, false);
    setModalActive(false);
  };

  return (
    <>
      <Card>
        <Text variant="bodyMd" fontWeight="bold" as="p">
          Pick Qualifier Group
        </Text>
        <Text variant="bodyMd" as="p">
          Select the customer segments that will be used to qualify
        </Text>
        <br />
        <Button
          onClick={() => {
            setTemporarySelected(selectedResources);
            setModalActive(true);
          }}
        >
          Choose Qualifiers
        </Button>
        <br />
        {selectedQualifiersDisplay}
      </Card>

      <Modal
        open={modalActive}
        onClose={() => setModalActive(false)}
        title="Select Qualifiers"
        primaryAction={{
          content: "Save",
          onAction: handleModalClose,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          {qualifiers.length > 0 ? (
            <>
              <TextContainer>Select one or more qualifiers below</TextContainer>
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
            </>
          ) : (
            <Card>
              <EmptyState
                heading="You have no qualifiers yet"
                image={quailifierlogo}
                action={{
                  content: "Create a qualifier",
                  onAction: () => {
                    navigate("/app/qualifiers/new");
                  },
                }}
                fullWidth
              >
                <p>
                  Qualifiers are a way to group customers based on their
                  behavior. You can use qualifiers to create segments of
                  customers that you can target with specific marketing
                  campaigns.
                </p>
              </EmptyState>
            </Card>
          )}
        </Modal.Section>
      </Modal>
    </>
  );
}

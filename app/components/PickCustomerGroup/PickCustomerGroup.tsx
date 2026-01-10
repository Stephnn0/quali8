import {
  Button,
  Card,
  EmptyState,
  Modal,
  OptionList,
  Text,
  TextContainer,
} from "@shopify/polaris";
import { useState } from "react";
import { useNavigate } from "react-router";
import quailifierlogo from "app/assets/qualifier-logo.png";
import type { getAllQualifiers } from "~/models/app.server/qualifiers/qualifier.server";
import { CampaingForm } from "~/routes/app.campaings.$id/hooks";

type PickCustomerGroupProps = {
  mockQualifiers?: Awaited<ReturnType<typeof getAllQualifiers>>;
  form: CampaingForm;
};


export function PickCustomerGroup({
    mockQualifiers = [],
    form,
  }: PickCustomerGroupProps) {
      const { fields } = form;
  const { customers, qualifierIds } = fields;
  const [selectedQualifiersIds, setSelectedQualifiersIds] = useState<string[]>(
    qualifierIds.value || [],
  );
  const [modalActive, setModalActive] = useState(false);
  const [temporarySelected, setTemporarySelected] = useState<string[]>([]);
  const navigate = useNavigate();

  const qualifiers = mockQualifiers?.map((qualifier) => ({
    id: qualifier.id,
    name: qualifier.name,
    customers: qualifier.customers,
  }));

  const handleSelectionQualifierIdChange = (selectedValues: string[]) => {
    setSelectedQualifiersIds(selectedValues);
    setTemporarySelected(selectedValues);
    qualifierIds.onChange(selectedValues);
  };

  const handleModalClose = () => {
    const selectedQualifier = qualifiers?.filter((q) =>
      temporarySelected.includes(String(q.id)),
    );

    const selectedCustomers = selectedQualifier?.flatMap((q) => q.customers);
    const selectedQualifierIds = selectedQualifier?.map((q) => String(q.id));

    customers.onChange(selectedCustomers as any);
    qualifierIds.onChange(selectedQualifierIds!);

    setModalActive(false);
  };

  const selectedQualifiersDisplay = qualifiers
    ?.filter((q) => selectedQualifiersIds.includes(String(q.id)))
    .map((q) => (
      <div
        key={q.id}
        style={{
          marginTop: "10px",
          padding: "0.5rem 1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        {q.name}
      </div>
    ));

  return (
    <>
      <Card>
        <Text variant="bodyMd" fontWeight="bold" as="p">
          Pick Customer Group
        </Text>
        <Text variant="bodyMd" as="p">
          Select the customer segments that will be used to target the campaign
        </Text>
        <br />
        <Button
          onClick={() => {
            setTemporarySelected(selectedQualifiersIds);
            setModalActive(true);
          }}
        >
          Choose Customer Groups
        </Button>
        <br />
        <div style={{}}>
          <p>{selectedQualifiersDisplay}</p>
        </div>
      </Card>

      <Modal
        open={modalActive}
        onClose={() => setModalActive(false)}
        title="Select Customer Groups"
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
          {qualifiers!.length > 0 ? (
            <>
              <TextContainer>Select one or more qualifiers below</TextContainer>
              <OptionList
                title="Select one or more qualifiers below"
                onChange={handleSelectionQualifierIdChange}
                options={qualifiers?.map((q) => ({
                  label: q.name,
                  value: String(q.id),
                }))}
                selected={selectedQualifiersIds}
                allowMultiple
              />
            </>
          ) : (
            <Card>
              <EmptyState
                heading="You have no customer groups yet"
                image={quailifierlogo}
                action={{
                  content: "Create a customer group",
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

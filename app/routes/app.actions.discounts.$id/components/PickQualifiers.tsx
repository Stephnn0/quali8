import {
  Button,
  Card,
  EmptyState,
  Modal,
  OptionList,
  Text,
  TextContainer,
} from "@shopify/polaris";
import type { DiscountForm } from "../hooks";
import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import quailifierlogo from "app/assets/qualifier-logo.png";
import type { getAllQualifiers } from "~/models/app.server/qualifiers/qualifier.server";

type PickQualifiersProps = {
  mockQualifiers: Awaited<ReturnType<typeof getAllQualifiers>>;
  form: DiscountForm;
};

export function PickQualifiers({ mockQualifiers, form }: PickQualifiersProps) {
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
          Select your customer target group
        </Text>
        <Text variant="bodyMd" as="p">
          On the checkout page, your target group condition will be applied.
        </Text>
        <br />
        <Button
          onClick={() => {
            setTemporarySelected(selectedQualifiersIds);
            setModalActive(true);
          }}
        >
          Select Target Group
        </Button>
        <br />
        <div style={{}}>
          <p>{selectedQualifiersDisplay}</p>
        </div>
      </Card>

      <Modal
        open={modalActive}
        onClose={() => setModalActive(false)}
        title="Select your Audience "
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
              <TextContainer>Your audience conditions is what decides who gets the discount at checkout.</TextContainer>
              <OptionList
                title="Select one or more target groups below"
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

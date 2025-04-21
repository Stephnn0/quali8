import {
  Button,
  Card,
  FormLayout,
  Select,
  TextField,
  LegacyStack,
  Box,
  Text,
} from "@shopify/polaris";
import { useState } from "react";
import { DeleteIcon } from "@shopify/polaris-icons";
import type { QualifierForm } from "../hooks";
import type { FilterCustomersForm } from "../hooks/filterCustomers";

type ConditionsQualifierProps = {
  form: QualifierForm;
  formFilterCustomers: FilterCustomersForm;
  fetchedConditions: Condition[];
};

// shared types and options
type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

const typeOptions = [
  { label: "Select a condition", value: "" }, // ⬅️ default placeholder
  { label: "Customer Tag", value: "customer_tag" },
  { label: "Customer Order Count", value: "customer_order_count" },
  { label: "Customer Email", value: "customer_email" },
  { label: "Customer Cities", value: "customer_country" },
  { label: "Customer Amount Spent", value: "customer_amount_spent" },
];
const comparisonTypeOptions = [
  { label: "Select a value type", value: "" }, // ⬅️ default placeholder
  { label: "is equal to", value: "equals" },
  { label: "is not equal to", value: "not_equals" },
];

export default function NewConditions({
  form,
  formFilterCustomers,
  fetchedConditions,
}: ConditionsQualifierProps) {
  const { fields } = form;
  const { formConditions } = fields;

  const { fields: formFilterCustomersConditions } = formFilterCustomers;
  const { formConditions: FilterCustomerCondtions } =
    formFilterCustomersConditions;

  const [conditions, setConditions] = useState<Condition[]>(
    fetchedConditions || [],
  );

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { type: "", comparisonType: "", value: "" },
    ]);
  };

  const removeCondition = (index: number) => {
    const updated = conditions.filter((_, i) => i !== index);
    setConditions(updated);
  };

  const handleChange = (
    index: number,
    field: keyof Condition,
    value: string,
  ) => {
    const updated = [...conditions];
    updated[index][field] = value;
    setConditions(updated);
    formConditions.onChange(updated as any[]); // Update the form conditions
    FilterCustomerCondtions.onChange(updated as any[]); // Update the filter customers conditions
  };

  // ------------------------------ ERROR HANDLING ------------------------------

  return (
    <Card>
      <Text variant="bodyMd" as="p" fontWeight="bold">
        Conditions
      </Text>
      <br />

      {conditions.length === 0 ? (
        <Box padding="300" background="bg-surface">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h2 style={{ paddingBottom: "7px" }}>No conditions added yet.</h2>
            <br />
            <br />

            <Button variant="primary" onClick={addCondition}>
              Add First Condition
            </Button>
          </div>
        </Box>
      ) : (
        <>
          {conditions.map((condition, index) => (
            <Box
              key={index}
              background="bg-fill-secondary"
              padding="300"
              borderRadius="200"
            >
              <LegacyStack wrap={false} alignment="leading" spacing="loose">
                <LegacyStack.Item fill>
                  <FormLayout>
                    <FormLayout.Group>
                      <Select
                        labelHidden
                        label="Collection rule type"
                        options={
                          condition.type === ""
                            ? typeOptions
                            : typeOptions.filter((opt) => opt.value !== "")
                        }
                        value={condition.type}
                        onChange={(value) => handleChange(index, "type", value)}
                      />
                      <Select
                        labelHidden
                        label="Collection rule condition"
                        options={
                          condition.comparisonType === ""
                            ? comparisonTypeOptions
                            : comparisonTypeOptions.filter(
                                (opt) => opt.value !== "",
                              )
                        }
                        value={condition.comparisonType}
                        onChange={(value) =>
                          handleChange(index, "comparisonType", value)
                        }
                      />
                      <TextField
                        labelHidden
                        label="Collection rule content"
                        value={condition.value}
                        onChange={(value) =>
                          handleChange(index, "value", value)
                        }
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </LegacyStack.Item>
                <Button
                  icon={DeleteIcon}
                  onClick={() => removeCondition(index)}
                  accessibilityLabel="Remove item"
                />
              </LegacyStack>
            </Box>
          ))}
          <br />
          <Button onClick={addCondition}>Add Condition</Button>
        </>
      )}
    </Card>
  );
}

import {
  Button,
  Card,
  FormLayout,
  Select,
  TextField,
  LegacyStack,
  Box,
} from "@shopify/polaris";
import { useState } from "react";
import { DeleteIcon } from "@shopify/polaris-icons";
import type { QualifierForm } from "../hooks";

type ConditionsQualifierProps = {
  form: QualifierForm;
};

// shared types and options
type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

const typeOptions = [
  { label: "Customer Tag", value: "customer-tag" },
  { label: "Customer Order Count", value: "customer-order-count" },
  { label: "Customer Email", value: "customer-email" },
  { label: "Customer Cities", value: "customer-cities" },
  { label: "Customer Amount Spent", value: "customer-amount-spent" },
];
const comparisonTypeOptions = [
  { label: "is equal to", value: "equals" },
  { label: "is not equal to", value: "not-equals" },
];

export default function NewConditions({ form }: ConditionsQualifierProps) {
  const { fields } = form;

  const { formConditions } = fields;

  const [conditions, setConditions] = useState<Condition[]>([
    { type: "product-type", comparisonType: "equals", value: "" },
  ]);

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { type: "product-type", comparisonType: "equals", value: "" },
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
    formConditions.value = updated as any[]; // Update the form conditions
  };

  return (
    <>
      <Card>
        <br />

        {conditions.map((condition, index) => (
          <>
            <Box
              key={index}
              background="bg-fill-secondary"
              padding="300"
              borderRadius="200"
            >
              <LegacyStack
                key={index}
                wrap={false}
                alignment="leading"
                spacing="loose"
              >
                <LegacyStack.Item fill>
                  <FormLayout>
                    <FormLayout.Group>
                      <Select
                        labelHidden
                        label="Collection rule type"
                        options={typeOptions}
                        value={condition.type}
                        onChange={(value) => handleChange(index, "type", value)}
                      />
                      <Select
                        labelHidden
                        label="Collection rule condition"
                        options={comparisonTypeOptions}
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
            <br />
          </>
        ))}
        <br />
        <Button onClick={addCondition}>Add Condition</Button>
      </Card>
    </>
  );
}

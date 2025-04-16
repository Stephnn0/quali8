import {
  Box,
  Button,
  Card,
  InlineGrid,
  Select,
  TextField,
} from "@shopify/polaris";
import { QualifierForm } from "../hooks";
import { useState } from "react";

type ConditionsQualifierProps = {
  form: QualifierForm;
};

const typeOptions = [
  { label: "Cart Total", value: "cart-total" },
  { label: "Product Item", value: "product-item" },
];

const comparisonTypeOptions = [
  { label: "Equals", value: "equals" },
  { label: "Greater Than", value: "greater-than" },
  { label: "Less Than", value: "less-than" },
];

export default function ConditionsQualifier({
  form,
}: ConditionsQualifierProps) {
  const { fields } = form;

  const { formConditions } = fields;

  const [conditions, setConditions] = useState<
    { type: string; value: string; comparisonType: string }[]
  >([]);

  const addCondition = () => {
    setConditions((prevConditions) => [
      ...prevConditions,
      { type: "cart-total", value: "", comparisonType: "equals" },
    ]);
  };

  const handleConditionChange = (
    index: number,
    field: string,
    newValue: string,
  ) => {
    const updatedConditions = [...conditions];
    updatedConditions[index][
      field as keyof (typeof updatedConditions)[number]
    ] = newValue;
    setConditions(updatedConditions);
    formConditions.value = updatedConditions as any[];
  };

  const removeCondition = (index: number) => {
    const updatedConditions = conditions.filter((_, i) => i !== index);
    setConditions(updatedConditions);
  };

  return (
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
            <InlineGrid gap="400" columns={2}>
              {/* Select for Type */}
              <Select
                label="Type"
                options={typeOptions}
                onChange={(value) =>
                  handleConditionChange(index, "type", value)
                }
                value={condition.type}
              />
              {/* Select for Comparison Type */}
              <Select
                label="Comparison Type"
                options={comparisonTypeOptions}
                onChange={(value) =>
                  handleConditionChange(index, "comparisonType", value)
                }
                value={condition.comparisonType}
              />
            </InlineGrid>
            <br />
            {/* Input for Value */}
            <TextField
              autoComplete="off"
              label="Value"
              placeholder="Enter value"
              value={condition.value}
              onChange={(value) => handleConditionChange(index, "value", value)}
            />
            <br />
            <Button onClick={() => removeCondition(index)}>
              Remove Condition
            </Button>
          </Box>
          <br />
        </>
      ))}

      <br />
      {/* Add Condition Button */}
      <Button variant="primary" onClick={addCondition}>
        Add Condition
      </Button>
    </Card>
  );
}

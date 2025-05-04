import {
  Button,
  Card,
  FormLayout,
  Select,
  LegacyStack,
  Box,
  Text,
  EmptyState,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { DeleteIcon } from "@shopify/polaris-icons";
import type { QualifierForm } from "../hooks";
import type { FilterCustomersForm } from "../hooks/filterCustomers";
import { ConditionValueInput } from "./DyanmicInputs";
import conditionsImage from "app/assets/conditions.png";
import type { getManyConditions } from "~/models/app.server/conditions/conditions.server";
import {
  comparisonTypeMap,
  comparisonTypeOptions,
  typeOptions,
} from "../conditions/conditions";

type ConditionsQualifierProps = {
  form: QualifierForm;
  formFilterCustomers: FilterCustomersForm;
  fetchedConditions: Awaited<ReturnType<typeof getManyConditions>>;
};

export type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

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

  useEffect(() => {
    if (fetchedConditions) {
      setConditions(fetchedConditions);
      FilterCustomerCondtions.onChange(fetchedConditions);
    }
  }, [fetchedConditions]);

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
    formConditions.onChange(updated as any[]); // Update the form conditions
    FilterCustomerCondtions.onChange(updated as any[]); // Update the filter customers conditions
  };

  const handleChange = (
    index: number,
    field: keyof Condition,
    value: string,
  ) => {
    const updated = [...conditions];

    updated[index][field] = value;

    if (field === "type") {
      const comparisonOptions = comparisonTypeMap[value] || [];
      const defaultComparison = comparisonOptions[0]?.value || "";
      updated[index].comparisonType = defaultComparison;
    }

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
        <Card>
          <EmptyState
            heading="No conditions added yet."
            image={conditionsImage}
            action={{
              content: "Add First Condition",
              onAction: addCondition,
            }}
            fullWidth
          >
            <p>Add First Condition</p>
          </EmptyState>
        </Card>
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
                          condition.type
                            ? comparisonTypeMap[condition.type] || []
                            : comparisonTypeOptions
                        }
                        value={condition.comparisonType}
                        onChange={(value) =>
                          handleChange(index, "comparisonType", value)
                        }
                      />
                      <ConditionValueInput
                        condition={condition}
                        index={index}
                        onChange={handleChange}
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

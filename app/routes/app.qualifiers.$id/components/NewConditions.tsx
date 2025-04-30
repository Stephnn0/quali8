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
import { useState } from "react";
import { DeleteIcon } from "@shopify/polaris-icons";
import type { QualifierForm } from "../hooks";
import type { FilterCustomersForm } from "../hooks/filterCustomers";
import { ConditionValueInput } from "./DyanmicInputs";
import conditionsImage from "app/assets/conditions.png";

type ConditionsQualifierProps = {
  form: QualifierForm;
  formFilterCustomers: FilterCustomersForm;
  fetchedConditions: Condition[];
};

// shared types and options
export type Condition = {
  type: string;
  comparisonType: string;
  value: string;
};

export const typeOptions = [
  { label: "Select a condition", value: "" }, // ⬅️ default placeholder
  { label: "Customer Tag", value: "customer_tag" },
  { label: "Customer Order Count", value: "customer_order_count" },
  { label: "Customer Email", value: "customer_email" },
  { label: "Customer Country", value: "customer_country" },
  { label: "Customer Amount Spent", value: "customer_amount_spent" },
  { label: "Latest Date Customer Was Updated", value: "updated_at" },
  { label: "Customer Tag (Not)", value: "tag_not" },
  { label: "Customer Order Date", value: "order_date" },
  { label: "Customer Last Name", value: "last_name" },
  { label: "Last Abandoned Order Date", value: "last_abandoned_order_date" },
  { label: "Customer First Name", value: "first_name" },
  { label: "Customer Created Date", value: "customer_date" },
  { label: "Accepts Marketing", value: "accepts_marketing" },
];

const comparisonTypeOptions = [
  { label: "Select a value type", value: "" }, // ⬅️ default placeholder
  { label: "is equal to", value: "equals" },
  { label: "is not equal to", value: "not_equals" },
];

export const comparisonTypeMap: Record<
  string,
  { label: string; value: string }[]
> = {
  customer_tag: [{ label: "is equal to", value: "equals" }],
  customer_order_count: [
    { label: "is equal to", value: "equals" },
    { label: "is greater than", value: "greater_than" },
    { label: "is less than", value: "less_than" },
    { label: "is greater than or equal to", value: "greater_than_equals" },
    { label: "is less than or equal to", value: "less_than_equals" },
  ],
  customer_email: [{ label: "is equal to", value: "equals" }],
  customer_country: [{ label: "is equal to", value: "equals" }],
  customer_amount_spent: [
    { label: "is equal to", value: "equals" },
    { label: "is greater than", value: "greater_than" },
    { label: "is less than", value: "less_than" },
    { label: "is greater than or equal to", value: "greater_than_equals" },
    { label: "is less than or equal to", value: "less_than_equals" },
  ],
  updated_at: [{ label: "is equal to", value: "equals" }],
  tag_not: [{ label: "is equal to", value: "equals" }],
  order_date: [
    { label: "was placed on", value: "equals" },
    { label: "was placed after", value: "greater_than" },
    { label: "was placed before", value: "less_than" },
  ],
  last_name: [{ label: "is equal to", value: "equals" }],
  last_abandoned_order_date: [
    { label: "happend on", value: "equals" },
    { label: "happend after", value: "greater_than" },
    { label: "happend before", value: "less_than" },
  ],
  first_name: [{ label: "is equal to", value: "equals" }],
  customer_date: [{ label: "is equal to", value: "equals" }],
  accepts_marketing: [{ label: "is", value: "equals" }],
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

  const [conditions, setConditions] = useState<Condition[]>(
    fetchedConditions || [],
  );

  console.log(conditions, "conditions");

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

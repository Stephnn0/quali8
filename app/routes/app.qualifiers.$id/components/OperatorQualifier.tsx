import { ButtonGroup, Button, Card, InlineStack, Text } from "@shopify/polaris";
import { useCallback, useState } from "react";
import type { QualifierForm } from "../hooks";
import type { FilterCustomersForm } from "../hooks/filterCustomers";

type OperatorQualifierProps = {
  form: QualifierForm;
  formFilterCustomers: FilterCustomersForm;
};

export function OperatorQualifier({
  form,
  formFilterCustomers,
}: OperatorQualifierProps) {
  const { fields } = form;
  const { ConditionLogicType } = fields;

  const { fields: filterCustomersFields } = formFilterCustomers;
  const { ConditionLogicTypeCustomer } = filterCustomersFields;

  const [activeButtonIndex, setActiveButtonIndex] = useState(0);

  const handleButtonClick = useCallback(
    (index: number) => {
      if (activeButtonIndex === index) return;
      setActiveButtonIndex(index);

      const logic = index === 0 ? "AND" : "OR";

      // ✅ Update both forms
      ConditionLogicType.onChange(logic);
      ConditionLogicTypeCustomer.onChange(logic);
    },
    [ConditionLogicType, ConditionLogicTypeCustomer, activeButtonIndex],
  );

  return (
    <Card>
      <InlineStack wrap={false}>
        <div
          style={{ paddingRight: "6px", display: "flex", alignItems: "center" }}
        >
          <Text variant="bodyMd" as="p">
            Apply filters when
          </Text>
        </div>

        <ButtonGroup variant="segmented">
          <Button
            pressed={activeButtonIndex === 0}
            onClick={() => handleButtonClick(0)}
          >
            All rules pass
          </Button>
          <Button
            pressed={activeButtonIndex === 1}
            onClick={() => handleButtonClick(1)}
          >
            Any rule passes
          </Button>
        </ButtonGroup>
      </InlineStack>
    </Card>
  );
}

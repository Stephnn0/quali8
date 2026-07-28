import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  InlineGrid,
  InlineStack,
  Select,
  Tag,
  Text,
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import { describeCondition } from "app/services/audiences/describeCondition";
import { comparisonTypeMap, typeOptions } from "../conditions/conditions";
import type { AudienceForm } from "../hooks/useAudienceForm";
import { isComplete } from "../hooks/useAudienceForm";
import { ConditionValueInput } from "./ConditionValueInput";

/**
 * The query builder: an all/any toggle, one row per condition
 * (field → operator → value), and a live plain-language summary.
 */
export default function ConditionsBuilder({ form }: { form: AudienceForm }) {
  const { conditions, logic } = form;
  const complete = conditions.filter(isComplete);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <BlockStack gap="050">
            <Text as="h2" variant="headingMd">
              Conditions
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              Customers join this audience when{" "}
              {logic === "AND" ? "all conditions" : "any condition"} below
              {logic === "AND" ? " match" : " matches"}.
            </Text>
          </BlockStack>
          <ButtonGroup variant="segmented">
            <Button
              pressed={logic === "AND"}
              onClick={() => form.setLogic("AND")}
            >
              Match all
            </Button>
            <Button pressed={logic === "OR"} onClick={() => form.setLogic("OR")}>
              Match any
            </Button>
          </ButtonGroup>
        </InlineStack>

        {conditions.length === 0 ? (
          <Box
            background="bg-fill-secondary"
            padding="600"
            borderRadius="300"
          >
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" tone="subdued">
                No conditions yet. Add one to define who belongs in this
                audience.
              </Text>
              <Button icon={PlusIcon} onClick={form.addCondition}>
                Add condition
              </Button>
            </BlockStack>
          </Box>
        ) : (
          <BlockStack gap="200">
            {conditions.map((condition) => (
              <Box
                key={condition.key}
                background="bg-fill-secondary"
                padding="300"
                borderRadius="200"
              >
                <InlineStack gap="200" blockAlign="start" wrap={false}>
                  <Box width="100%">
                    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="200">
                      <Select
                        labelHidden
                        label="Condition"
                        options={
                          condition.type === ""
                            ? typeOptions
                            : typeOptions.filter((option) => option.value !== "")
                        }
                        value={condition.type}
                        onChange={(type) =>
                          form.updateCondition(condition.key, { type })
                        }
                      />
                      <Select
                        labelHidden
                        label="Operator"
                        options={comparisonTypeMap[condition.type] ?? []}
                        value={condition.comparisonType}
                        onChange={(comparisonType) =>
                          form.updateCondition(condition.key, {
                            comparisonType,
                          })
                        }
                        disabled={!condition.type}
                      />
                      <ConditionValueInput
                        type={condition.type}
                        value={condition.value}
                        onChange={(value) =>
                          form.updateCondition(condition.key, { value })
                        }
                      />
                    </InlineGrid>
                  </Box>
                  <Button
                    icon={DeleteIcon}
                    variant="tertiary"
                    onClick={() => form.removeCondition(condition.key)}
                    accessibilityLabel="Remove condition"
                  />
                </InlineStack>
              </Box>
            ))}

            <InlineStack>
              <Button icon={PlusIcon} onClick={form.addCondition}>
                Add condition
              </Button>
            </InlineStack>
          </BlockStack>
        )}

        {complete.length > 0 ? (
          <Box
            background="bg-surface-secondary"
            padding="300"
            borderRadius="200"
          >
            <InlineStack gap="150" blockAlign="center" wrap>
              <Text as="span" variant="bodySm" tone="subdued">
                This audience:
              </Text>
              {complete.map((condition, index) => (
                <InlineStack
                  key={condition.key}
                  gap="150"
                  blockAlign="center"
                >
                  {index > 0 ? (
                    <Text as="span" variant="bodySm" tone="subdued">
                      {logic === "AND" ? "and" : "or"}
                    </Text>
                  ) : null}
                  <Tag>{describeCondition(condition)}</Tag>
                </InlineStack>
              ))}
            </InlineStack>
          </Box>
        ) : null}
      </BlockStack>
    </Card>
  );
}

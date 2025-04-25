import { useLoaderData } from "@remix-run/react";
import {
  Button,
  ButtonGroup,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  PageActions,
  Select,
  TextField,
  Text,
  Checkbox,
  Divider,
} from "@shopify/polaris";
import { loader } from "./loader";
import { useDiscountForm } from "./hooks";
import { useState } from "react";
import DateSelector from "./components/DateSelector";
import { ShippingRates } from "./components/ShippingRates";
import { PickQualifiers } from "./components/PickQualifiers";

export { loader };

export default function ActionDiscounts() {
  const loaderData = useLoaderData<typeof loader>();

  const form = useDiscountForm();

  const { fields } = form;

  const {
    code,
    type,
    valueType,
    automaticOrCode,
    shippingDiscountState,

    limitUsagePerOneCustomer,
    combinedWithOrderDiscounts,
    combinedWithProductDiscounts,
  } = fields;

  const [discountValue, setDiscountValue] = useState<number | "">(
    Number(valueType.value) || "",
  );

  const [discountUnit, setDiscountUnit] = useState<"percentage" | "fixed" | "">(
    type.value || "percentage",
  );

  const [operator, setOperator] = useState<"CODE" | "AUTOMATIC">(
    automaticOrCode.value || "CODE",
  );

  const handleOperatorChange = (selectedOperator: "CODE" | "AUTOMATIC") => {
    setOperator(selectedOperator);
    automaticOrCode.value = selectedOperator;
  };

  const [discountState, setDiscountState] = useState<"ENABLED" | "DISABLED">(
    shippingDiscountState.value || "ENABLED",
  );

  const handleDiscountStateChange = (
    selectedDiscountState: "ENABLED" | "DISABLED",
  ) => {
    setDiscountState(selectedDiscountState);
    shippingDiscountState.value = selectedDiscountState;
  };

  return (
    <Page
      title="Shipping Discounts"
      backAction={{ content: "Back", url: "/app/actions/discounts" }}
    >
      {/* =========================================================================== */}
      {/* =================================== REWARDS =============================== */}
      {/* =========================================================================== */}
      {/* =========================================================================== */}

      <Layout>
        <Layout.Section>
          <Card>
            <Card>
              <InlineGrid alignItems="center">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="bodyMd" as="p" fontWeight="bold">
                    Discount is enabled
                  </Text>
                  <ButtonGroup variant="segmented">
                    <Button
                      disabled={discountState === "ENABLED"}
                      onClick={() => handleDiscountStateChange("ENABLED")}
                    >
                      On
                    </Button>
                    <Button
                      disabled={discountState === "DISABLED"}
                      onClick={() => handleDiscountStateChange("DISABLED")}
                    >
                      Off
                    </Button>
                  </ButtonGroup>
                </div>
              </InlineGrid>
            </Card>
            <br />

            <TextField
              {...code}
              autoComplete="off"
              label={
                automaticOrCode.value === "CODE"
                  ? "Discount Code"
                  : "Discount Name"
              }
              placeholder={
                automaticOrCode.value === "CODE"
                  ? "Enter discount code"
                  : "Enter discount name"
              }
            />
            <br />
            <Checkbox
              label="Limit usage to one per customer"
              checked={limitUsagePerOneCustomer.value}
              onChange={(value) => limitUsagePerOneCustomer.onChange(value)}
            />
            <Divider />
            <br />

            <InlineGrid gap="400" columns={2}>
              <Select
                label="Discount Type"
                options={[
                  { label: "Percentage", value: "percentage" },
                  { label: "Value", value: "fixed" },
                ]}
                onChange={(selected) => {
                  setDiscountUnit(selected as "percentage" | "fixed" | "");
                  type.value = selected as "percentage" | "fixed";
                }}
                value={discountUnit}
              />
              <TextField
                {...valueType}
                autoComplete="off"
                label={
                  discountUnit === "percentage"
                    ? "Discount Percentage"
                    : "Discount Value"
                }
                placeholder={
                  discountUnit === "percentage"
                    ? "Enter percentage value"
                    : "Enter currency value"
                }
                value={discountValue !== "" ? String(discountValue) : ""}
                onChange={(value) => {
                  setDiscountValue(Number(value));
                  valueType.value = value;
                }}
                type="number"
              />
            </InlineGrid>
          </Card>
        </Layout.Section>
        {/* =========================================================================== */}
        {/* ============  COMBINE DISCOUNT WITH PRODUCTS/ORDERS ======================= */}
        {/* =========================================================================== */}
        {/* =========================================================================== */}

        <Layout.Section>
          <Card>
            <Text variant="bodyMd" as="p" fontWeight="bold">
              Discount combination
            </Text>
            <br />
            <Text variant="bodyMd" as="p">
              This shipping discount can be combined with other product and
              order discounts
            </Text>
            <br />
            <InlineGrid>
              <Checkbox
                label="Product discounts"
                checked={combinedWithProductDiscounts.value}
                onChange={(value) =>
                  combinedWithProductDiscounts.onChange(value)
                }
              />
              <Checkbox
                label="Order discounts"
                checked={combinedWithOrderDiscounts.value}
                onChange={(value) => combinedWithOrderDiscounts.onChange(value)}
              />
            </InlineGrid>
          </Card>
        </Layout.Section>

        {/* =========================================================================== */}
        {/* =========================== CODE OR AUTOMATIC ============================= */}
        {/* =========================================================================== */}
        {/* =========================================================================== */}
        {/* Toggle Buttons for AND/OR */}

        <Layout.Section>
          <InlineStack wrap={false}>
            <ButtonGroup variant="segmented">
              <Button
                disabled={operator === "CODE"}
                onClick={() => handleOperatorChange("CODE")}
              >
                Discount Code
              </Button>
              <Button
                disabled={operator === "AUTOMATIC"}
                onClick={() => handleOperatorChange("AUTOMATIC")}
              >
                Automatic Discount
              </Button>
            </ButtonGroup>
          </InlineStack>
        </Layout.Section>

        {/* =========================================================================== */}
        {/* =========================== ENABLE OR DISABLE ============================= */}
        {/* =========================================================================== */}
        {/* =========================================================================== */}

        <Layout.Section>
          <PickQualifiers
            mockQualifiers={loaderData?.payload.qualifiers}
            form={form}
          />
        </Layout.Section>

        <Layout.Section>
          <ShippingRates
            shippingRates={loaderData?.payload.rates}
            form={form}
          />
        </Layout.Section>

        {/* =========================================================================== */}
        {/* =========================== ENABLE OR DISABLE ============================= */}
        {/* =========================================================================== */}
        {/* =========================================================================== */}
        <Layout.Section>
          <DateSelector form={form} />
        </Layout.Section>

        <Layout.Section>
          <PageActions
            primaryAction={{
              content: "Save",
              onAction: form.submit,
              disabled: !form.dirty,
            }}
          />
        </Layout.Section>

        <br />
      </Layout>
    </Page>
  );
}

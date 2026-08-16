import { useLoaderData, useNavigate } from "react-router";
import {
  Button,
  ButtonGroup,
  Card,
  InlineGrid,
  Layout,
  Page,
  PageActions,
  Select,
  TextField,
  Text,
  Checkbox,
  Divider,
  Banner,
} from "@shopify/polaris";
import { loader } from "./loader";
import { FeatureEyebrow } from "app/components/OneApp";
import { useDiscountForm } from "./hooks";
import { useState } from "react";
import DateSelector from "./components/DateSelector";
import { ShippingRates } from "./components/ShippingRates";
import { PickQualifiers } from "./components/PickQualifiers";


export { loader };

export default function ActionDiscounts() {
  const loaderData = useLoaderData<typeof loader>();

  const form = useDiscountForm();

  const { fields, valueError, qualifierIdsError } = form;

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

  const [discountValue, setDiscountValue] = useState<number | 0>(
    valueType.value || 0,
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

  const navigate = useNavigate();

  return (
    <Page
      title="Shipping discount"
      titleMetadata={<FeatureEyebrow featureKey="smart-shipping" />}
      backAction={{
        content: "Back",
        onAction: () => navigate("/app/actions/discounts"),
      }}
    >
      {/* =========================================================================== */}
      {/* =================================== REWARDS =============================== */}
      {/* =========================================================================== */}
      {/* =========================================================================== */}


      <Layout>
        <Layout.Section>
          <Banner>
            <p>
              Shipping discounts don't need campaings since we leverage Shopify's built-in date range functionality.
            </p>
          </Banner>
        </Layout.Section>
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
            {automaticOrCode.value === "CODE" && (
              <Checkbox
                label="Limit usage to one per customer"
                checked={limitUsagePerOneCustomer.value}
                onChange={(value) => limitUsagePerOneCustomer.onChange(value)}
              />
            )}
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
                value={discountValue !== 0 ? String(discountValue) : String(0)}
                onChange={(value) => {
                  setDiscountValue(Number(value));
                  valueType.onChange(Number(value)); // make sure you're using onChange
                }}
                type="number"
                error={valueError as any} // Pass the error to TextField
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
        {/* =========================== PICK QUALIFIERS ============================= */}
        {/* =========================================================================== */}
        {/* =========================================================================== */}

        <Layout.Section>

          <PickQualifiers
            mockQualifiers={loaderData?.payload?.qualifiers?.qualifiers}
            form={form}
          />
          {qualifierIdsError && (
            <Text variant="bodyMd" as="p" tone="critical">
              {qualifierIdsError}
            </Text>
          )}
        </Layout.Section>

        <Layout.Section>
          <ShippingRates
            shippingRates={loaderData?.payload?.rates}
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

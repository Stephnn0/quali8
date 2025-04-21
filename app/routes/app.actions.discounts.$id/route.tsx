import { useLoaderData } from "@remix-run/react";
import {
  Banner,
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

  console.log("Loader Data", loaderData);

  const form = useDiscountForm();

  const { fields } = form;

  const {
    code,
    type,
    valueType,
    automaticOrCode,
    // startTime,
    // startDate,
    // endDate,
    // endTime,
    // hasEndDate,
    // customers,
  } = fields;

  const [discountValue, setDiscountValue] = useState<number | "">("");

  const [discountUnit, setDiscountUnit] = useState<"percentage" | "fixed" | "">(
    "",
  );

  const [operator, setOperator] = useState<"CODE" | "AUTOMATIC">("CODE");

  const handleOperatorChange = (selectedOperator: "CODE" | "AUTOMATIC") => {
    setOperator(selectedOperator);
    automaticOrCode.value = selectedOperator;
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
          <PickQualifiers mockQualifiers={loaderData?.payload} form={form} />
        </Layout.Section>

        <Layout.Section>
          <ShippingRates shippingRates={loaderData?.rates} form={form} />
        </Layout.Section>
        <Layout.Section>
          <Banner onDismiss={() => {}}>
            <p>
              When applying discounts on specific shipping rates, make sure they
              have a unique name to avoid conflicts with other discounts.
            </p>
          </Banner>
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

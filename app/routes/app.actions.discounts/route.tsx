import { useLoaderData } from "@remix-run/react";
import {
  Card,
  InlineGrid,
  Layout,
  Page,
  Select,
  TextField,
} from "@shopify/polaris";
import { loader } from "./loader";
import { useDiscountForm } from "./hooks";
import { useState } from "react";

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
    // startTime,
    // startDate,
    // endDate,
    // endTime,
    // hasEndDate,
    // customers,
  } = fields;

  const [discountValue, setDiscountValue] = useState<number | "">("");

  const [discountUnit, setDiscountUnit] = useState<
    "percentage" | "currency" | ""
  >("");

  const [operator, setOperator] = useState<"CODE" | "AUTOMATIC">("CODE");

  const handleOperatorChange = (selectedOperator: "CODE" | "AUTOMATIC") => {
    setOperator(selectedOperator);
    automaticOrCode.value = selectedOperator;
  };

  return (
    <Page
      title="Marketing Actions"
      backAction={{ content: "Back", url: "/app/actions" }}
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
                  { label: "Value", value: "currency" },
                ]}
                onChange={(selected) => {
                  setDiscountUnit(selected as "percentage" | "currency" | "");
                  type.value = selected as "percentage" | "currency";
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
      </Layout>
    </Page>
  );
}

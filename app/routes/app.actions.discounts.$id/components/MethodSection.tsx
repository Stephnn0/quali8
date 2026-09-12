import { BlockStack, Button, Card, Checkbox, TextField } from "@shopify/polaris";
import { DiscountCodeIcon, MagicIcon } from "@shopify/polaris-icons";
import type { DiscountForm } from "../hooks";
import { ChoiceTiles } from "./ChoiceTiles";
import { SectionHead } from "./SectionHead";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateCode = () =>
  "SHIP" +
  Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");

export function MethodSection({ form }: { form: DiscountForm }) {
  const { automaticOrCode, code, limitUsagePerOneCustomer } = form.fields;
  const isCode = automaticOrCode.value === "CODE";

  return (
    <Card>
      <BlockStack gap="400">
        <SectionHead
          number="1"
          title="How customers get it"
          text="A code they type at checkout, or a discount that applies on its own."
        />
        <ChoiceTiles
          name="Discount method"
          value={automaticOrCode.value}
          onChange={automaticOrCode.onChange}
          options={[
            {
              value: "CODE",
              label: "Discount code",
              description: "Share a code in emails, ads, or with VIPs.",
              icon: DiscountCodeIcon,
            },
            {
              value: "AUTOMATIC",
              label: "Automatic",
              description: "Applies at checkout with nothing to enter.",
              icon: MagicIcon,
            },
          ]}
        />
        <TextField
          label={isCode ? "Discount code" : "Discount name"}
          value={code.value}
          onChange={code.onChange}
          onBlur={code.onBlur}
          error={code.error}
          autoComplete="off"
          placeholder={isCode ? "SHIPFREE" : "Free shipping for VIPs"}
          helpText={
            isCode
              ? "Customers enter this at checkout. Letters and numbers work best."
              : "Customers see this name at checkout and on their order."
          }
          connectedRight={
            isCode ? (
              <Button onClick={() => code.onChange(generateCode())}>
                Generate
              </Button>
            ) : undefined
          }
        />
        {isCode ? (
          <Checkbox
            label="Limit to one use per customer"
            helpText="Each customer can redeem the code once."
            checked={limitUsagePerOneCustomer.value}
            onChange={limitUsagePerOneCustomer.onChange}
          />
        ) : null}
      </BlockStack>
    </Card>
  );
}

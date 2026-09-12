import { useNavigate } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  Layout,
  Page,
  PageActions,
  Text,
} from "@shopify/polaris";
import { loader } from "./loader";
import { FeatureEyebrow } from "app/components/OneApp";
import { useDiscountForm } from "./hooks";
import { MethodSection } from "./components/MethodSection";
import { ValueSection } from "./components/ValueSection";
import { AudienceSection } from "./components/AudienceSection";
import { RatesSection } from "./components/RatesSection";
import { ScheduleSection } from "./components/ScheduleSection";
import { CombinationsSection } from "./components/CombinationsSection";
import { SummaryCard } from "./components/SummaryCard";
import styles from "../app.actions.discounts/smartShipping.module.css";

export { loader };

export default function ActionDiscounts() {
  const form = useDiscountForm();
  const navigate = useNavigate();
  const { shippingDiscountState, code } = form.fields;
  const enabled = shippingDiscountState.value === "ENABLED";

  const back = () => navigate("/app/actions/discounts");

  return (
    <Page
      title={
        form.isNew
          ? "New shipping discount"
          : code.value || "Shipping discount"
      }
      titleMetadata={<FeatureEyebrow featureKey="smart-shipping" />}
      backAction={{ content: "Smart Shipping", onAction: back }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <MethodSection form={form} />
            <ValueSection form={form} />
            <AudienceSection form={form} />
            <RatesSection form={form} />
            <ScheduleSection form={form} />
            <CombinationsSection form={form} />
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <div className={styles.statusRow}>
                <BlockStack gap="050">
                  <Text as="h2" variant="headingSm">
                    Status
                  </Text>
                  {enabled ? (
                    <Badge tone="success">On</Badge>
                  ) : (
                    <Badge>Off</Badge>
                  )}
                </BlockStack>
                <ButtonGroup variant="segmented">
                  <Button
                    pressed={enabled}
                    onClick={() => shippingDiscountState.onChange("ENABLED")}
                  >
                    On
                  </Button>
                  <Button
                    pressed={!enabled}
                    onClick={() => shippingDiscountState.onChange("DISABLED")}
                  >
                    Off
                  </Button>
                </ButtonGroup>
              </div>
            </Card>
            <SummaryCard form={form} />
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <PageActions
            primaryAction={{
              content: form.isNew ? "Create discount" : "Save changes",
              onAction: form.submit,
              disabled: !form.dirty || form.submitting,
              loading: form.submitting,
            }}
            secondaryActions={[{ content: "Cancel", onAction: back }]}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

import { BlockStack, Layout, Page, PageActions } from "@shopify/polaris";
import { useNavigate } from "react-router";
import { loader } from "./loader";
import { useAudienceForm } from "./hooks/useAudienceForm";
import DetailsCard from "./components/DetailsCard";
import ConditionsBuilder from "./components/ConditionsBuilder";
import PreviewCard from "./components/PreviewCard";
import { AudienceInsights } from "./components/AudienceInsights";

export { loader };

export default function AudienceEditor() {
  const form = useAudienceForm();
  const navigate = useNavigate();
  const { qualifier } = form;

  return (
    <Page
      title={qualifier ? (qualifier.name ?? "Audience") : "Create audience"}
      backAction={{ onAction: () => navigate("/app/qualifiers") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {qualifier ? (
              <AudienceInsights
                customers={qualifier.customers ?? []}
                conditions={qualifier.conditions ?? []}
                conditionLogicType={qualifier.conditionLogicType}
                lastSyncedAt={qualifier.lastSyncedAt}
              />
            ) : null}
            <DetailsCard form={form} />
            <ConditionsBuilder form={form} />
            <PageActions
              primaryAction={{
                content: qualifier ? "Save changes" : "Create audience",
                onAction: form.submit,
                disabled: !form.dirty,
                loading: form.saving,
              }}
            />
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <PreviewCard form={form} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

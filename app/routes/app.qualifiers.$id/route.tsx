import { Layout, Page, PageActions } from "@shopify/polaris";
import { useQualifierForm } from "./hooks";
import NameDescriptionQualifier from "./components/NameDescription";
import { OperatorQualifier } from "./components/OperatorQualifier";
import CustomersQueryQualifier from "./components/CustomersQueryQualifier";
import NewCondtions from "./components/NewConditions";

export default function QualifiersForm() {
  const form = useQualifierForm();

  return (
    <Page title="Create Qualifier" backAction={{ url: "/app/qualifiers" }}>
      <Layout>
        <Layout.Section>
          <NameDescriptionQualifier form={form} />
        </Layout.Section>
        <Layout.Section>
          <CustomersQueryQualifier form={form} />
        </Layout.Section>
        <Layout.Section>
          <OperatorQualifier />
        </Layout.Section>
        <Layout.Section>
          <NewCondtions form={form} />
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
      </Layout>
    </Page>
  );
}

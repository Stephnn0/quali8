import { Layout, Page, PageActions } from "@shopify/polaris";
import { useQualifierForm } from "./hooks";
import NameDescriptionQualifier from "./components/NameDescription";
import { OperatorQualifier } from "./components/OperatorQualifier";
import CustomersQueryQualifier from "./components/CustomersQueryQualifier";
import NewCondtions from "./components/NewConditions";
import { useFilterCustomersForm } from "./hooks/filterCustomers";

export default function QualifiersForm() {
  const form = useQualifierForm();
  const formFilterCustomers = useFilterCustomersForm();

  return (
    <Page title="Create Qualifier" backAction={{ url: "/app/qualifiers" }}>
      <Layout>
        <Layout.Section>
          <NameDescriptionQualifier form={form} />
        </Layout.Section>
        <Layout.Section>
          <CustomersQueryQualifier
            form={form}
            formFilterCustomers={formFilterCustomers}
          />
        </Layout.Section>
        <Layout.Section>
          <OperatorQualifier
            form={form}
            formFilterCustomers={formFilterCustomers}
          />
        </Layout.Section>
        <Layout.Section>
          <NewCondtions form={form} formFilterCustomers={formFilterCustomers} />
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

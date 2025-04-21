import { Layout, Page, PageActions } from "@shopify/polaris";
import { useQualifierForm } from "./hooks";
import NameDescriptionQualifier from "./components/NameDescription";
import { OperatorQualifier } from "./components/OperatorQualifier";
import CustomersQueryQualifier from "./components/CustomersQueryQualifier";
import NewCondtions from "./components/NewConditions";
import { useFilterCustomersForm } from "./hooks/filterCustomers";
import { useLoaderData } from "@remix-run/react";
import { loader } from "./loader";

export { loader };

export default function QualifiersForm() {
  const loaderData = useLoaderData<typeof loader>();

  const qualifier = loaderData?.payload.qualifier;

  const isNew = loaderData.payload?.qualifier === null;

  const form = useQualifierForm();
  const formFilterCustomers = useFilterCustomersForm();

  const { conditions } = qualifier || {};

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
          <NewCondtions
            form={form}
            formFilterCustomers={formFilterCustomers}
            fetchedConditions={conditions}
          />
        </Layout.Section>
        <Layout.Section>
          <PageActions
            primaryAction={{
              content: isNew ? "Create" : "Update",
              onAction: form.submit,
              disabled: !form.dirty,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

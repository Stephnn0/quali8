import { Layout, Page, Text, PageActions } from "@shopify/polaris";
import { loader } from "./loader";
import { useQualifierForm } from "./hooks";
import NameDescriptionQualifier from "./components/NameDescription";
import { OperatorQualifier } from "./components/OperatorQualifier";
import CustomersQueryQualifier from "./components/CustomersQueryQualifier";
import NewCondtions from "./components/NewConditions";
import { useFilterCustomersForm } from "./hooks/filterCustomers";
import { useLoaderData } from "react-router";

export { loader };

export default function QualifiersForm() {
  const loaderData = useLoaderData<typeof loader>();

  const qualifier = loaderData?.payload?.qualifier;

  const form = useQualifierForm();

  const { errorName } = form;

  const formFilterCustomers = useFilterCustomersForm();

  const { error } = formFilterCustomers;

  const conditions = qualifier ? qualifier.conditions : [];

  return (
    <Page
      title={!qualifier ? "Create Customer Group" : (qualifier?.name ?? "Customer Group")}
      backAction={{ url: "/app/qualifiers" }}
    >
      <Layout>
        <Layout.Section>
          <NameDescriptionQualifier form={form} />
        </Layout.Section>
        <Layout.Section>
          {errorName && (
            <Text variant="bodyMd" as="p" tone="critical">
              {errorName}
            </Text>
          )}
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
            fetchedConditions={conditions!}
          />
        </Layout.Section>
        <Layout.Section>
          <CustomersQueryQualifier
            form={form}
            formFilterCustomers={formFilterCustomers}
          />
        </Layout.Section>
        <Layout.Section>
          {error && (
            <Text variant="bodyMd" as="p" tone="critical">
              {error}
            </Text>
          )}
        </Layout.Section>
        <Layout.Section>
          <PageActions
            primaryAction={{
              content: !qualifier ? "Create" : "Update",
              onAction: form.submit,
              disabled: !form.dirty,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

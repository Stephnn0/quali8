import { Layout, Page, PageActions, Text } from "@shopify/polaris";
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

  const { errorName } = form;

  const formFilterCustomers = useFilterCustomersForm();
  const { error } = formFilterCustomers;

  const { conditions } = qualifier || {};

  return (
    <Page
      title={isNew ? "Create Qualifier" : qualifier?.name}
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

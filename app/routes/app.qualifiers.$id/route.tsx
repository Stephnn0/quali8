import { Layout, Page, Text, PageActions } from "@shopify/polaris";
import { loader } from "./loader/index";
import { useQualifierForm } from "./hooks";
import NameDescriptionQualifier from "./components/NameDescription";
import { OperatorQualifier } from "./components/OperatorQualifier";
import CustomersQueryQualifier from "./components/CustomersQueryQualifier";
import NewCondtions from "./components/NewConditions";
import { useFilterCustomersForm } from "./hooks/filterCustomers";
import { useLoaderData } from "@remix-run/react";

export { loader };

export default function QualifiersForm() {
  console.log("------------------------1---------------------");
  const loaderData = useLoaderData<typeof loader>();
  console.log("------------------------2---------------------");

  const qualifier = loaderData?.payload?.qualifier;
  console.log("------------------------3---------------------");

  const form = useQualifierForm();
  console.log("------------------------4---------------------");

  const { errorName } = form;
  console.log("------------------------5---------------------");

  const formFilterCustomers = useFilterCustomersForm();
  console.log("------------------------6---------------------");

  const { error } = formFilterCustomers;
  console.log("------------------------7---------------------");

  const conditions = qualifier ? qualifier.conditions : [];

  console.log("------------------------8---------------------");

  return (
    <Page
      title={!qualifier ? "Create Qualifier" : (qualifier?.name ?? "Qualifier")}
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
            fetchedConditions={conditions ?? []}
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

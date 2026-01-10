import { Button, ButtonGroup, Card, InlineGrid, Layout, Page, PageActions, Text } from "@shopify/polaris";
import NameDurationCampaing from "./components/NameDurationCampaing";
import { useCampaingForm } from "./hooks";
import DateSelectorsCampaing from "./components/DateSelector";
import { PickCustomerGroup } from "app/components/PickCustomerGroup/PickCustomerGroup";
import { useLoaderData } from "react-router";
import { loader } from "./loader";

export { loader };


export default function CampaingForm() {
  const loaderData = useLoaderData<typeof loader>();

  
  const form = useCampaingForm();


  return (
    <Page title={"Create Campaing"} backAction={{ url: "/app/campaings" }}>
      <Layout>
        <Layout.Section>
          <NameDurationCampaing form={form} />
        </Layout.Section>
   <Layout.Section>
   <Card>
              <InlineGrid alignItems="center">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="bodyMd" as="p" >
                    Campaing is enabled
                  </Text>
                  <ButtonGroup variant="segmented">
                    <Button
                      disabled={form.fields.status.value === "ACTIVE"}
                      onClick={() => form.fields.status.onChange("ACTIVE")}
                    >
                      On
                    </Button>
                    <Button
                      disabled={form.fields.status.value === "DRAFT"}
                      onClick={() => form.fields.status.onChange("DRAFT")}
                    >
                      Off
                    </Button>
                  </ButtonGroup>
                </div>
              </InlineGrid>
            </Card>
   </Layout.Section>



        <Layout.Section>
          <DateSelectorsCampaing form={form} />
        </Layout.Section>

        <Layout.Section>
          <PickCustomerGroup
            mockQualifiers={loaderData?.payload?.qualifiers?.qualifiers}
            form={form}
          />
          {/* {qualifierIdsError && (
            <Text variant="bodyMd" as="p" tone="critical">
              {qualifierIdsError}
            </Text>
          )} */}
        </Layout.Section>




        <Layout.Section>
          <PageActions
            primaryAction={{
              content: "Create",
              onAction: form.submit,
              disabled: !form.dirty,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}



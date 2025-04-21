import { Link, useLoaderData } from "@remix-run/react";
import {
  Button,
  IndexTable,
  Text,
  Page,
  useIndexResourceState,
  Card,
  ButtonGroup,
  Layout,
  MediaCard,
} from "@shopify/polaris";
import { loader } from "./loader";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import image from "app/assets/qualifiers.png";

export { loader };

export default function Qualifiers() {
  const loaderData = useLoaderData<typeof loader>();

  const qualifiers =
    loaderData?.payload?.map((data) => ({
      id: data.id,
      name: data.name,
      description: data.description,
      conditionLogicType: data.conditionLogicType,
      customers: data.customers.length || 0,
    })) || [];

  const resourceName = {
    singular: "Qualifier",
    plural: "Qualifiers",
  };

  const { selectedResources, allResourcesSelected } =
    useIndexResourceState(qualifiers);

  const rowMarkup = qualifiers?.map(
    ({ id, name, description, conditionLogicType, customers }, index) => (
      <IndexTable.Row
        id={String(id)}
        key={id}
        selected={selectedResources.includes(String(id))}
        position={index}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {" "}
            {name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {description}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {conditionLogicType}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {customers}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Link to={`/app/qualifiers/${id}`}>
              <Button icon={EditIcon}></Button>
            </Link>
            <Button icon={DeleteIcon}></Button>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      title="Qualifiers"
      primaryAction={
        <Link to="new">
          <Button>Create Qualifier</Button>
        </Link>
      }
    >
      <Layout>
        <Layout.Section>
          <MediaCard
            title="Getting Started with Qualifiers?"
            primaryAction={{
              content: "Learn about getting started",
              onAction: () => {},
            }}
            description="Watch this video to learn how to get started with Qualifiers."
            popoverActions={[{ content: "Dismiss", onAction: () => {} }]}
          >
            <img
              alt=""
              width="100%"
              height="100%"
              style={{
                objectFit: "cover",
                objectPosition: "center",
              }}
              src={image}
            />
          </MediaCard>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={qualifiers!.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              selectable={false}
              headings={[
                { title: "Name" },
                { title: "Description" },
                { title: "Condition Logic Type" },
                { title: "Customers" },
                { title: "Actions" },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

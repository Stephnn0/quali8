import { Link, useLoaderData } from "@remix-run/react";
import {
  Button,
  IndexTable,
  Text,
  Page,
  useIndexResourceState,
  Card,
} from "@shopify/polaris";
import { loader } from "./loader";

export { loader };

export default function Qualifiers() {
  const loaderData = useLoaderData<typeof loader>();

  const qualifiers =
    loaderData?.payload?.map((data) => ({
      id: data.id,
      name: data.name,
    })) || [];

  const resourceName = {
    singular: "Qualifier",
    plural: "Qualifiers",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(qualifiers);

  const rowMarkup = qualifiers?.map(({ id, name }, index) => (
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
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Qualifiers"
      primaryAction={
        <Link to="new">
          <Button>Create Qualifier</Button>
        </Link>
      }
    >
      <Card>
        <IndexTable
          resourceName={resourceName}
          itemCount={qualifiers!.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[{ title: "Name" }]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}

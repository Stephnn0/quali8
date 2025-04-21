import { Link, useLoaderData, useSubmit } from "@remix-run/react";
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
  Modal,
  TextContainer,
  Frame,
} from "@shopify/polaris";
import { loader } from "./loader";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import image from "app/assets/qualifiers.png";
import { useCallback, useState } from "react";
import { action } from "./action";

export { loader, action };

export default function Qualifiers() {
  const loaderData = useLoaderData<typeof loader>();
  const [selectedQualifier, setSelectedQualifier] = useState<{
    id: number;
    conditionIds: number[];
  } | null>(null);

  console.log("loaderData", loaderData);

  const qualifiers =
    loaderData?.payload?.map((data) => ({
      id: data.id,
      name: data.name,
      description: data.description,
      conditionLogicType: data.conditionLogicType,
      customers: data.customers.length || 0,
      conditionIds: data.conditions?.map((condition) => condition.id) || [],
    })) || [];

  const resourceName = {
    singular: "Qualifier",
    plural: "Qualifiers",
  };

  const { selectedResources, allResourcesSelected } =
    useIndexResourceState(qualifiers);

  const rowMarkup = qualifiers?.map(
    (
      { id, name, description, conditionLogicType, customers, conditionIds },
      index,
    ) => (
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
            <Button
              icon={DeleteIcon}
              onClick={() => handleDeleteClick(id, conditionIds)}
            ></Button>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const [modalActive, setModalActive] = useState(false);

  const handleModalChange = useCallback(
    () => setModalActive((prev) => !prev),
    [],
  );

  const handleDeleteClick = (id: number, conditionIds: number[]) => {
    setSelectedQualifier({ id, conditionIds });
    setModalActive(true);
  };

  const submit = useSubmit();

  const handleDeleteConfirm = () => {
    setModalActive(false);

    if (!selectedQualifier) return;
    try {
      const body = {
        qualifierId: selectedQualifier.id,
        conditionIds: selectedQualifier.conditionIds,
      };
      submit(
        {
          body: JSON.stringify(body),
        },
        {
          method: "DELETE",
          encType: "multipart/form-data",
          action: `/app/qualifiers`,
        },
      );
    } catch (error) {
      console.log("Error deleting qualifier", error);
    }
  };

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
      <Frame>
        <Modal
          open={modalActive}
          onClose={handleModalChange}
          title="Are you sure you want to delete this qualifier?"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: handleDeleteConfirm,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: handleModalChange,
            },
          ]}
        >
          <Modal.Section>
            <TextContainer>
              <p>
                This action cannot be undone. Are you sure you want to delete
                this qualifier?
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>
      </Frame>
    </Page>
  );
}

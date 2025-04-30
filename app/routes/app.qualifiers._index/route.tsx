import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
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
  EmptyState,
} from "@shopify/polaris";
import { loader } from "./loader";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import image from "app/assets/ccc.png";
import { useCallback, useState } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useAppBridge } from "@shopify/app-bridge-react";
import quailifierlogo from "app/assets/q-im.png";

export { loader };

export async function action({ request }: ActionFunctionArgs) {
  return null;
}

export default function Qualifiers() {
  const loaderData = useLoaderData<typeof loader>();
  const [selectedQualifier, setSelectedQualifier] = useState<{
    id: number;
    conditionIds: number[];
  } | null>(null);

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
  const shopify = useAppBridge();

  const fetcher = useFetcher();

  const handleDeleteConfirm = () => {
    setModalActive(false);

    if (!selectedQualifier) return;
    try {
      const body = {
        qualifierId: selectedQualifier.id,
        conditionIds: selectedQualifier.conditionIds,
      };
      fetcher.submit(
        {
          body: JSON.stringify(body),
        },
        {
          method: "DELETE",
          encType: "multipart/form-data",
          action: `/api/qualifiers`,
        },
      );
      shopify.toast.show("Qualifier deleted");
    } catch (error) {
      console.log("Error deleting qualifier", error);
    }
  };

  const navigate = useNavigate();

  // ==================================== pagination

  const [searchParams, setSearchParams] = useSearchParams();

  console.log("", searchParams);

  const currentPage = loaderData?.page || 1;
  const totalItems = loaderData?.total;
  const itemsPerPage = loaderData?.itemsPerPage;
  const hasNext = currentPage * itemsPerPage! < totalItems!;
  const hasPrevious = currentPage > 1;

  const goToPage = (page: number) => {
    setSearchParams({ page: page.toString() });
  };

  return (
    <Page
      title="Qualifiers"
      primaryAction={
        <Link to="new">
          <Button variant="primary">Create Qualifier</Button>
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
          {qualifiers.length > 0 ? (
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
                pagination={{
                  hasNext,
                  hasPrevious,
                  onNext: () => goToPage(currentPage + 1),
                  onPrevious: () => goToPage(currentPage - 1),
                }}
              >
                {rowMarkup}
              </IndexTable>
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="You have no qualifiers yet"
                image={quailifierlogo}
                action={{
                  content: "Create a qualifier",
                  onAction: () => {
                    navigate("/app/qualifiers/new");
                  },
                }}
                fullWidth
              >
                <p>
                  Qualifiers are a way to group customers based on their
                  behavior. You can use qualifiers to create segments of
                  customers that you can target with specific marketing
                  campaigns.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>
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
              This action cannot be undone. Are you sure you want to delete this
              qualifier?
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

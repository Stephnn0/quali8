import { useFetcherLoad } from "app/hooks/useFetcherLoad";
import type { loader } from "app/routes/api.qualifiers/route";
import CardHeader from "../CardHeader/CardHeader";
import { BlockStack, Card, ResourceItem, Text } from "@shopify/polaris";
import SplitList from "../../components/SplitList/SplitList";
import PlainEmptyState from "app/components/PlainEmptyState/PlainEmptyState";
import quaim from "app/assets/q-im2.png";
import QualifierSkeleton from "./QualifierSkeleton";
import { useAppSubscription } from "~/services/subscriptions/hooks/useAppSubscription";
import { GatekeepAppPlanState } from "../../components/GatekeepState/GateKeepStatePlan";

const emptyState = (
  <PlainEmptyState
    title="There are no qualifiers to show"
    description="Your qualifiers will appear here once you add them."
    action={{
      url: "/app/qualifiers/new",
      content: "Create qualifier",
    }}
  />
);

export default function Qualifiers() {
  const { subHasQualifiers } = useAppSubscription();

  const initialData = useFetcherLoad<typeof loader>("/api/qualifiers", {
    load: true,
  });

  const initialPayload =
    initialData.data && "qualifiers" in initialData.data
      ? initialData.data?.qualifiers
      : [];

  const qualifiers = initialPayload || [];
  const isBusy = initialData.state !== "idle";

  const QualifierHeader = (
    <CardHeader
      title="Targeting Groups"
      subtitle="Create powerful customer groups based on their behavior and apply promotions or campaigns to increase conversions."
      action={{
        url: "/app/qualifiers",
        content: "Go to all audience groups",
        disabled: !subHasQualifiers,
      }}
      icon={<img src={quaim} alt="gift icon" />}
    />
  );

  const resourceName = { singular: "qualifier", plural: "qualifiers" };

  const renderItem = (item: any) => {
    const { id, name } = item;

    return (
      <ResourceItem
        verticalAlignment="center"
        id={id}
        accessibilityLabel={`View details for ${name}`}
        name={name}
        url={`/app/qualifiers/${id}`}
      >
        <Text variant="bodyMd" breakWord fontWeight="medium" as="h3">
          <span className={""}>{name}</span>
        </Text>
      </ResourceItem>
    );
  };

  if (isBusy || (!initialPayload && subHasQualifiers))
    return <QualifierSkeleton />;

  return (
    <Card>
      <BlockStack gap="400">
        {QualifierHeader}

        {subHasQualifiers ? (
          <SplitList
            length={6}
            renderItem={renderItem}
            divider={<div style={{ height: "12rem" }} className={""} />}
            resourceName={resourceName}
            items={qualifiers.map(({ id, ...qualifiers }) => ({
              ...qualifiers,
              id: String(id),
            }))}
            emptyState={emptyState}
          />
        ) : (
          <GatekeepAppPlanState />
        )}
      </BlockStack>
    </Card>
  );
}

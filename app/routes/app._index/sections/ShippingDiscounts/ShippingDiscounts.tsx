import { BlockStack, Card, ResourceItem, Text } from "@shopify/polaris";
import SplitList from "../../components/SplitList/SplitList";
import ShippingDiscountSkeleton from "./ShippingDiscountsSkeleton";
import PlainEmptyState from "app/components/PlainEmptyState/PlainEmptyState";
import { useFetcherLoad } from "app/hooks/useFetcherLoad";
import type { loader } from "app/routes/api.actions.discounts/route";
import CardHeader from "../CardHeader/CardHeader";
import quaim from "app/assets/q-im2.png";
import { useAppSubscription } from "~/services/subscriptions/hooks/useAppSubscription";
import { GatekeepAppPlanState } from "../../components/GatekeepState/GateKeepStatePlan";

const emptyState = (
  <PlainEmptyState
    title="There are no shipping discounts to show"
    description="Your shipping discount will appear here once you add them."
    action={{
      url: "/app/actions/discounts/new",
      content: "Create Shipping Discount",
    }}
  />
);

export default function ShippingDiscount() {
  const { subHasShippingDiscounts } = useAppSubscription();

  const initialData = useFetcherLoad<typeof loader>("/api/actions/discounts", {
    load: true,
  });

  const initialPayload =
    initialData.data && "shippingDiscounts" in initialData.data
      ? initialData.data.shippingDiscounts
      : [];

  const shippingDiscounts = initialPayload || [];
  const isBusy = initialData.state !== "idle";

  const QualifierHeader = (
    <CardHeader
      title="Shipping Discounts"
      subtitle="Reward your customers with discounts on shipping rates at checkout based on their behavior."
      action={{
        url: "/app/actions/discounts",
        content: "Go to all discounts",
        disabled: !subHasShippingDiscounts,
      }}
      icon={<img src={quaim} alt="gift icon" />}
    />
  );

  const resourceName = {
    singular: "shipping discount",
    plural: "shipping discounts",
  };

  const renderItem = (item: any) => {
    const { id, codeOrName } = item;

    return (
      <ResourceItem
        verticalAlignment="center"
        id={id}
        accessibilityLabel={`View details for ${codeOrName}`}
        name={codeOrName}
        url={`/app/actions/discounts/${id}`}
      >
        <Text variant="bodyMd" breakWord fontWeight="medium" as="h3">
          <span className={""}>{codeOrName}</span>
        </Text>
      </ResourceItem>
    );
  };

  if (isBusy || (!initialPayload && subHasShippingDiscounts))
    return <ShippingDiscountSkeleton />;

  return (
    <Card>
      <BlockStack gap="400">
        {QualifierHeader}

        {subHasShippingDiscounts ? (
          <SplitList
            length={6}
            renderItem={renderItem}
            divider={<div style={{ height: "12rem" }} className={""} />}
            resourceName={resourceName}
            items={shippingDiscounts.map(({ id, ...shippingDiscounts }) => ({
              ...shippingDiscounts,
              id: String(id),
              name: shippingDiscounts.codeOrName,
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

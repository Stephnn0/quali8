import { MediaCard } from "@shopify/polaris";
import dateTimeBlockImg from "app/assets/sds.png";
import { useAppSubscription } from "~/services/subscriptions/hooks/useAppSubscription";

export default function CheckoutBlock({ type }: { type: any }) {
  const { subHasShippingDiscounts } = useAppSubscription();

  const primaryAction = {
    content: "Perform Action",
  };

  switch (type) {
    case "date_time_picker":
      return (
        <MediaCard
          portrait
          title="Shipping Discounts"
          description="Create shipping discounts based on customer qualifiers"
          primaryAction={{
            ...primaryAction,
            url: "/app/actions/discounts",
            disabled: !subHasShippingDiscounts,
          }}
        >
          <img width="100%" alt="Date and time block" src={dateTimeBlockImg} />
        </MediaCard>
      );
    default:
      return null;
  }
}

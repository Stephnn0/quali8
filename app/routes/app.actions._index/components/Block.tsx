import { Button, MediaCard } from "@shopify/polaris";
import dateTimeBlockImg from "app/assets/sds.png";
import { useAppSubscription } from "app/services/subscriptions/hooks/useAppSubscription";
import { useNavigate } from "react-router";

export default function CheckoutBlock({ type }: { type: any }) {
  const { subHasShippingDiscounts } = useAppSubscription();

  const navigate = useNavigate();
  const primaryAction = {
    content: "Create Promotion",
    onClick: () => navigate("/app/actions/discounts"),
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
            disabled: !subHasShippingDiscounts,
          }}
        >
          <img width="100%" alt="Date and time block" src={dateTimeBlockImg} />
        </MediaCard>
      );
    case "product_editor":
      return (
        <MediaCard
          portrait
          title="Product Editor"
          description="Edit you product's data on steroids"
          primaryAction={{
            ...primaryAction,
            url: "/app/tools/products",
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

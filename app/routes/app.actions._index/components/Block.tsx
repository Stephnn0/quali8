import { MediaCard } from "@shopify/polaris";
import dateTimeBlockImg from "app/assets/sds.png";

export default function CheckoutBlock({ type }: { type: any }) {
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
          }}
        >
          <img width="100%" alt="Date and time block" src={dateTimeBlockImg} />
        </MediaCard>
      );
    default:
      return null;
  }
}

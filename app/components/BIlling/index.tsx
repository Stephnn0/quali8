import { CalloutCard } from "@shopify/polaris";
import image from "app/assets/memv.png";
import { APP } from "~/constants/app.constants";

export function Billing() {
  return (
    <CalloutCard
      title="Subscribe to a plan"
      illustration={image}
      primaryAction={{
        content: "Choose a Plan",
        url: `shopify://admin/charges/${APP.APP_HANDLE}/pricing_plans`,
      }}
    >
      <p>You need to subscribe to enjoy our services</p>
    </CalloutCard>
  );
}

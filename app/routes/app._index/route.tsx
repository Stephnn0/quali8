import type { LoaderFunctionArgs } from "react-router";
import { Banner, FooterHelp, Layout, Link, Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import Dashboardcomponent from "app/components/Dashboardbanner";
import Qualifiers from "./sections/Qualifiers/Qualifiers";
import ShippingDiscount from "./sections/ShippingDiscounts/ShippingDiscounts";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    return { payload: null, code: "none" };
  } catch (error) {
    return handleApiError({ errors: error, code: "error" });
  }
};

const redirectTo = () => {
  window.open("https://www.8instruments.com/products", "_blank");
};

export default function Index() {
  return (
    <Page>
      <Dashboardcomponent />
      <br />

      <Layout>
        <Layout.Section>
          <Banner>
            <p>
              Learn more about Quali8 on our blog.{" "}
              <Link url="" onClick={redirectTo}>
                We’d love to hear your thoughts!
              </Link>
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Qualifiers />
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <ShippingDiscount />
        </Layout.Section>
        <Layout.Section>
          <FooterHelp>@8Instruments. All rights reserved.</FooterHelp>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

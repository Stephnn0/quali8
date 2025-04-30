import type { LoaderFunctionArgs } from "@remix-run/node";
import { Banner, FooterHelp, Layout, Link, Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import Dashboardcomponent from "app/components/Dashboardbanner";
import Qualifiers from "./sections/Qualifiers/Qualifiers";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page>
      <Dashboardcomponent />
      <br />

      <Layout>
        <Layout.Section>
          <Banner onDismiss={() => {}}>
            <p>
              Use your finance report to get detailed information about your
              business. <Link url="">Let us know what you think</Link>
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Qualifiers />
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Qualifiers />
        </Layout.Section>
        <Layout.Section>
          <FooterHelp>
            Learn more about{" "}
            <Link url="https://help.shopify.com/manual/orders/fulfill-orders">
              Use your finance report to get detailed information about your
              business.
            </Link>
          </FooterHelp>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Banner,
  Button,
  Card,
  FooterHelp,
  InlineGrid,
  Layout,
  Link,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import Dashboardcomponent from "app/components/Dashboardbanner";

import image from "app/assets/m.png";
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
        {/* <Layout.Section>
          <InlineGrid gap="400" columns={2}>
            <Card>
              <Text variant="bodyLg" fontWeight="medium" as="h1">
                Marketing Actions
              </Text>

              <img src={image} alt="Banner" />

              <p>
                Vezzo is a powerful tool that helps you manage your store's
                discounts and shipping rates.
              </p>

              <br />

              <Button variant="primary">Get Started</Button>
            </Card>
            <Card>
              <Text variant="bodyLg" fontWeight="medium" as="h1">
                Smart Qualifiers
              </Text>

              <img src={image} alt="Banner" />

              <br />

              <p>
                Vezzo is a powerful tool that helps you manage your store's
                discounts and shipping rates.
              </p>

              <br />

              <Button variant="primary">Get Started</Button>
            </Card>
          </InlineGrid>
        </Layout.Section> */}
        <Layout.Section>
          <Banner onDismiss={() => {}}>
            <p>
              Use your finance report to get detailed information about your
              business. <Link url="">Let us know what you think</Link>
            </p>
          </Banner>
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

import type { LoaderFunctionArgs } from "react-router";
import { BlockStack, FooterHelp, Layout, Link, Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import Hero from "./sections/Hero/Hero";
import CurrentPlan from "./sections/CurrentPlan/CurrentPlan";
import HowItWorks from "./sections/HowItWorks/HowItWorks";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page>
      <BlockStack gap="500">
        <Hero />

        <Layout>
          <Layout.Section variant="oneHalf">
            <CurrentPlan />
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <HowItWorks />
          </Layout.Section>
        </Layout>

        <FooterHelp>
          Learn more about Quali8 on the{" "}
          <Link url="https://www.8instruments.com/products" target="_blank">
            8Instruments blog
          </Link>
          . @8Instruments. All rights reserved.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}

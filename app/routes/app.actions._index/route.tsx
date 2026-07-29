import { Page, Layout, InlineGrid } from "@shopify/polaris";
import CheckoutBlock from "./components/Block";

export default function Actions() {
  return (
    <Page
      title="Promotions"
      subtitle="Shipping discounts and product bundles for your sales seasons"
    >
      <Layout>
        <Layout.Section>
          <InlineGrid gap="600" columns={3}>
            <CheckoutBlock type="date_time_picker" />
            <CheckoutBlock type="bundles" />
            {/* <CheckoutBlock type="product_editor" /> */}

            {/* <ComingSoonBlock
              image={loyalty}
              title={"Loyalty Program"}
              description={
                "Create a loyalty program based on customer behavior"
              }
            /> */}
            {/* <ComingSoonBlock
              image={smart}
              title={"Smart Recommendations"}
              description={
                "Create smart recommendations based on customer behavior"
              }
            /> */}
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

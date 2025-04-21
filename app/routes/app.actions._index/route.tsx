import { Page, Layout, InlineGrid } from "@shopify/polaris";
import CheckoutBlock from "./components/Block";
import ComingSoonBlock from "./sections/ComingSoon";
import smart from "app/assets/sm.png";

export default function Actions() {
  return (
    <Page title="Marketing Actions">
      <Layout>
        <Layout.Section>
          <InlineGrid gap="600" columns={3}>
            <CheckoutBlock type="date_time_picker" />
            {/* <ComingSoonBlock
              image={loyalty}
              title={"Loyalty Program"}
              description={
                "Create a loyalty program based on customer behavior"
              }
            /> */}
            <ComingSoonBlock
              image={smart}
              title={"Smart Recommendations"}
              description={
                "Create smart recommendations based on customer behavior"
              }
            />
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

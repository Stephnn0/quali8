import { Page } from "@shopify/polaris";

export default function AllActions() {
  return (
    <Page backAction={{ url: "/app/actions" }} title="My Actions">
      <p>All Actions</p>
    </Page>
  );
}

import { Button, Page } from "@shopify/polaris";
import { Link } from "@remix-run/react";

export default function Campaings() {
  return (
    <Page
      title="Campaings"
      primaryAction={
        <Link to="new">
          <Button variant="primary">Create Campaing</Button>
        </Link>
      }
    ></Page>
  );
}

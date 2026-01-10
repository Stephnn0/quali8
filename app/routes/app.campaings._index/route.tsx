import { Button, Page } from "@shopify/polaris";
import { Link } from "react-router";

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

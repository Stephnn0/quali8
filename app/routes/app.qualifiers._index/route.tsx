import { Link } from "@remix-run/react";
import { Button, Page } from "@shopify/polaris";

export default function Qualifiers() {
  return (
    <Page
      title="Qualifiers"
      primaryAction={
        <Link to="new">
          <Button>Create Qualifier</Button>
        </Link>
      }
    >
      <div>
        <h1>Welcome to the Qualifiers Page</h1>
        <p>This page is under construction.</p>
      </div>
    </Page>
  );
}

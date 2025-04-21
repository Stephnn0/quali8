import type { LoaderFunctionArgs } from "@remix-run/node";
import { MediaCard, Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import image from "app/assets/o.png";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page>
      <MediaCard
        title="Welcome to Quali8"
        primaryAction={{
          content: "Learn about getting started",
          onAction: () => {},
        }}
        description="Watch this video to learn how to get started with Qualifiers."
        popoverActions={[{ content: "Dismiss", onAction: () => {} }]}
      >
        <img
          alt=""
          width="100%"
          height="100%"
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
          src={image}
        />
      </MediaCard>
    </Page>
  );
}

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";

const GRAPHQL_QUERY_FILES = `#graphql
  query assistantFiles($first: Int!, $query: String) {
    files(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          __typename
          ... on MediaImage {
            id
            alt
            image {
              url
              width
              height
            }
          }
        }
      }
    }
  }
`;

export type ShopifyFileImage = {
  id: string;
  url: string;
  alt: string | null;
};

/**
 * GET /api/shopify-files?search= — images from the store's Files section
 * (Content → Files) for the hero/popup image pickers. Requires the
 * `read_files` access scope; responds with `scopeMissing` when the app
 * hasn't been granted it yet so the UI can explain instead of erroring.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);

  await gatekeepRoute({ authAdminContext }, { hasAssistant: true }, "throw");

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").slice(0, 80);
  const query = ["media_type:IMAGE", search ? `filename:${search}*` : null]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await authAdminContext.admin.graphql(GRAPHQL_QUERY_FILES, {
      variables: { first: 40, query },
    });
    const payload = await response.json();

    type Edge = {
      node: {
        __typename: string;
        id?: string;
        alt?: string | null;
        image?: { url?: string | null } | null;
      };
    };

    const images: ShopifyFileImage[] = ((payload.data?.files.edges ??
      []) as Edge[])
      .filter(
        (edge) => edge.node.__typename === "MediaImage" && edge.node.image?.url,
      )
      .map((edge) => ({
        id: edge.node.id!,
        url: edge.node.image!.url!,
        alt: edge.node.alt ?? null,
      }));

    return { images, scopeMissing: false, errors: null };
  } catch (error) {
    // A missing scope surfaces as an ACCESS_DENIED GraphQL error
    const message = error instanceof Error ? error.message : String(error);
    const scopeMissing = /access|scope|denied/i.test(message);
    if (!scopeMissing) console.error("Shopify files listing failed:", error);
    return {
      images: [],
      scopeMissing,
      errors: scopeMissing
        ? null
        : [{ message: "Could not load your files. Try again." }],
    };
  }
}

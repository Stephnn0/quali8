import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { Page } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import {
  FeatureShowcaseCard,
  RequestFeatureBand,
  getCategoryFeatures,
  getOneAppCategory,
  type OneAppCategory,
} from "app/components/OneApp";
import styles from "app/components/OneApp/oneapp.module.css";

/**
 * One page per OneApp category (a sidebar entry each). Shows a showcase card
 * for every feature in the category; the cards navigate to the feature.
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const category = getOneAppCategory(params.category ?? "");
  if (!category) {
    throw new Response("Category not found", { status: 404 });
  }

  return { category };
};

export default function CategoryPage() {
  const { category } = useLoaderData<typeof loader>();
  const features = getCategoryFeatures((category as OneAppCategory).key);

  return (
    <Page>
      <header className={styles.pageHeader}>
        <span className={styles.pageHeaderNumber} aria-hidden>
          {String(features.length).padStart(2, "0")}
        </span>
        <div className={styles.pageHeaderBody}>
          <p className={styles.pageHeaderEyebrow}>OneApp category</p>
          <h1 className={styles.pageHeaderTitle}>{category.name}</h1>
          <p className={styles.pageHeaderTagline}>{category.tagline}</p>
        </div>
      </header>

      <div className={styles.showcaseGrid}>
        {features.map((feature) => (
          <FeatureShowcaseCard key={feature.key} feature={feature} />
        ))}
      </div>

      <div className={styles.categoryFoot}>
        <RequestFeatureBand />
      </div>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);

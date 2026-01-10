import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {  Link, Outlet, redirect, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "app/shopify.server";
import { getAppStatus } from "app/services/setup/getAppStatus";
import db from "app/db.server";
import { getSubscription } from "./getSubscription";
//
//
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";


export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async (loaderContext: LoaderFunctionArgs) => {
  const authAdminContext = await authenticate.admin(loaderContext.request);

  const {
    session: { shop },
  } = authAdminContext;

  const [{ shopInfo, shopifyStore }, subscription] = await Promise.all([
    //
    // Redirects to /setup if app needs to be setup
    getAppStatus(authAdminContext, db), // * Redirects
    //
    getSubscription(loaderContext, authAdminContext),
  ]);


  // ! fix this
  if (!shopifyStore?.functionId) {
    
    console.log('shopifyStore?.functionId', shopifyStore?.functionId);
  }

  // console.log("App Status", shopInfo, shopifyStore);

  return {
    shop,
    shopInfo,
    shopifyStore,
    subscription,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded={true} apiKey={apiKey} >
      <PolarisProvider i18n={enTranslations}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        {/* <Link to="/app/campaings">Campaigns</Link> */}
        <Link to="/app/qualifiers">Audiences</Link>
        <Link to="/app/actions">Promotions</Link>
        {/* <Link to="/app/templates">Templates</Link> */}
        <Link to="/app/settings">Subscriptions</Link>
      </NavMenu>
      <Outlet />
      </PolarisProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

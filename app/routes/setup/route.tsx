import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useRouteError,
  useSubmit,
} from "@remix-run/react";
import { useEffect } from "react";
import { getAppStatus } from "app/services/setup/getAppStatus";
import { setupApp } from "app/services/setup";
import { Text } from "@shopify/polaris";
import { FullPageCardErrorState } from "app/components/FullPageCard/variants/FullPageCardErrorState";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { FullPageCard } from "app/components/FullPageCard";
import SetupGraphic from "./SetupGraphic/SetupGraphic";
import AppSurfaceLayout from "app/components/AppSurfaceLayout/AppSurfaceLayout";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";
import { boundary } from "@shopify/shopify-app-remix/server";
import { PUBLIC_ENV } from "~/constants/app.constants";

export function wait(duration: number) {
  const promise = new Promise<void>((resolve) => {
    setTimeout(resolve, duration);
  });

  return promise;
}
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("---------------------- loader setup---------------------");

  const authAdminContext = await authenticate.admin(request);
  const { redirect } = authAdminContext;

  const { isSetup } = await getAppStatus(authAdminContext, db, false);
  if (isSetup) throw redirect("/app");

  return json({ isSetup });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("---------------------- action setup---------------------");

  const adminContext = await authenticate.admin(request);

  try {
    // Minimum 2 seconds setup duration to admire the design 🎨
    const waitPromise = wait(2000);

    const setupAppPromise = (async () => {
      let setupAppSuccess = false;
      let attempts = 0;
      let setupAppError = null;
      const delay = 120;

      // TODO - see if we can either remove this or make it more robust
      while (attempts < 5 && !setupAppSuccess) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await setupApp(adminContext, db);
          setupAppSuccess = true;
          return;
        } catch (error) {
          setupAppError = error;
          attempts += 1;

          // eslint-disable-next-line no-await-in-loop
          await wait(delay);
        }
      }
      throw setupAppError;
    })();

    await Promise.all([waitPromise, setupAppPromise]);

    return { payload: null, code: "success" };
  } catch (error) {
    console.error(`Error in /setup`); // eslint-disable-line no-console
    return handleApiError({ errors: error, code: "error" });
  }
};

export default function Setup() {
  console.log("---------------------- setup---------------------");

  const { isSetup } = useLoaderData<typeof loader>();
  const { errors: actionErrors } = useActionData<typeof action>() || {};

  const submit = useSubmit();

  const fetcher = useFetcher();
  const error = actionErrors && actionErrors?.length > 0;

  console.log("isSetup", isSetup);
  console.log("error", error);
  console.log("actionErrors", actionErrors);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isSetup && !error) {
      console.log("---------------------- setup---------------------");
      console.log("Submitting...");

      fetch("/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trigger: true }),
      });

      // fetcher.submit({}, { method: "post" });
      console.log("---------------------- setup fini---------------------");
    }
  }, [isSetup, error]);

  return (
    <AppProvider isEmbeddedApp apiKey={PUBLIC_ENV.VITE_SHOPIFY_API_KEY}>
      <AppSurfaceLayout>
        {error ? (
          <FullPageCardErrorState heading="There was an error during installation">
            <Text as="p" alignment="center">
              Reload the page and try again.
            </Text>
          </FullPageCardErrorState>
        ) : (
          <FullPageCard alignAllCenter pagePadding>
            <SetupGraphic />
          </FullPageCard>
        )}
      </AppSurfaceLayout>
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

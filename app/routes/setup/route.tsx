import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useEffect } from "react";
import { getAppStatus } from "app/services/setup/getAppStatus";
import { setupApp } from "app/services/setup";
import { Text } from "@shopify/polaris";
import { FullPageCardErrorState } from "app/components/FullPageCard/variants/FullPageCardErrorState";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { FullPageCard } from "app/components/FullPageCard";
import SetupGraphic from "./SetupGraphic/SetupGraphic";
import AppSurfaceLayout from "app/components/AppSurfaceLayout/AppSurfaceLayout";

export function wait(duration: number) {
  const promise = new Promise<void>((resolve) => {
    setTimeout(resolve, duration);
  });

  return promise;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authAdminContext = await authenticate.admin(request);
  const { redirect } = authAdminContext;

  const { isSetup } = await getAppStatus(authAdminContext, db, false);
  if (isSetup) throw redirect("/app");

  return json({ isSetup });
};

export const action = async ({ request }: ActionFunctionArgs) => {
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
    return { errors: error, code: "error" };
  }
};

export default function Setup() {
  const { isSetup } = useLoaderData<typeof loader>();
  const actionErrors = useActionData<typeof action>() || {};

  const submit = useSubmit();
  const error = actionErrors;

  useEffect(() => {
    if (!isSetup && !error) {
      submit({}, { method: "POST" });
    }
  }, [isSetup, submit, error]);

  return (
    <AppProvider isEmbeddedApp apiKey={"34da8696cbfc709d9fdc83cb99b19030"}>
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

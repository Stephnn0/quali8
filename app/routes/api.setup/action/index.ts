import type { ActionFunctionArgs } from "@remix-run/node";
import { wait } from "~/routes/setup/route";
import { setupApp } from "~/services/setup";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";
import db from "~/db.server";
import { authenticate } from "~/shopify.server";

export default async function action({ request }: ActionFunctionArgs) {
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
}

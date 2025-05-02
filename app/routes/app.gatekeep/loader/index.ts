import { authenticate } from "app/shopify.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import type { GateKeepRouteParams } from "../types";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  try {
    return handleApiSuccess<GateKeepRouteParams>({
      payload: { code: params.code as any }, // ! fix
      code: "loaded",
    });
  } catch (errors) {
    console.error("Error in gatekeepRoute:", errors);
    throw errors;
  }
};

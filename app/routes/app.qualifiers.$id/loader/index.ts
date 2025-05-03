import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifierByIdWithConditionsAndCustomers } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import type { QualifierLoaderData } from "../types";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const id = String(params.id || "");

  if (id === "new") {
    return handleApiSuccess<QualifierLoaderData>({
      payload: {
        qualifier: null,
      },
      code: "loaded",
    });
  }

  try {
    const qualifier = await getQualifierByIdWithConditionsAndCustomers(
      session.shop,
      id,
      db,
    );

    if (!qualifier) {
      return handleApiSuccess<QualifierLoaderData>({
        payload: {
          qualifier: null,
        },
        code: "loaded",
      });
    }

    return handleApiSuccess<QualifierLoaderData>({
      payload: {
        qualifier,
      },
      code: "loaded",
    });
  } catch (error) {
    console.error("Error fetching qualifier:", error);
  }
}

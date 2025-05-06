import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifierByIdWithConditionsAndCustomers } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import type { QualifierLoaderData } from "../types";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";

const mockQualifier = {
  name: "New Qualifier",
  description: "This is a mock qualifier for creating new ones.",
  conditionLogicType: "AND",

  conditions: [
    {
      type: "customer_tag",
      comparisonType: "equals",
      value: "vip",
    },
  ],

  customers: [],
  shippingDiscounts: [],
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const id = String(params.id || "");
  try {
    if (id === "new") {
      console.log("------------------------new---------------------");

      return handleApiSuccess<QualifierLoaderData>({
        payload: {
          qualifier: mockQualifier as any,
        },
        code: "loaded",
      });
    }

    console.log("------------------------q---------------------");

    const qualifier = await getQualifierByIdWithConditionsAndCustomers(
      session.shop,
      id,
      db,
    );

    console.log("------------------------q 2---------------------");

    if (!qualifier) {
      return handleApiSuccess<QualifierLoaderData>({
        payload: {
          qualifier: mockQualifier as any,
        },
        code: "loaded",
      });
    }
    console.log("------------------------q 4---------------------");

    return handleApiSuccess<QualifierLoaderData>({
      payload: {
        qualifier,
      },
      code: "loaded",
    });
  } catch (error) {
    console.error("Error fetching qualifier:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}

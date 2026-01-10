import type { LoaderFunctionArgs } from "@remix-run/node";
import { getCampaignByIdWithRelations } from "~/models/app.server/campaings";
import { authenticate } from "~/shopify.server";
import { handleApiSuccess } from "~/utils/handleApiSuccess";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";
import db from "app/db.server";
import type { CampaignLoaderData } from "../types";
import { getQualifiersByShop } from "~/models/app.server/qualifiers/qualifier.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const context = await authenticate.admin(request);
  console.log('------------------------campaing loader------------------------:');

  const { session } = context;

  const id = String(params.id || "");
  try {

    const qualifiers = await getQualifiersByShop(
      {
        where: {
          shop: context.session.shop,
        },

        include: {
          customers: {
            select: {
              id: true,
              shopifyId: true,
            },
          },
        },
      },
      db,
    );


    if (id === "new") {
      return handleApiSuccess<CampaignLoaderData>({ 
        payload: {
          campaing: null,
          qualifiers: qualifiers,
        },
        code: "loaded",
      });
    }

    

    const campaing = await getCampaignByIdWithRelations(session.shop, id, db);

    if (!campaing) {
      return handleApiSuccess<CampaignLoaderData>({
        payload: {
          campaing: null,
          qualifiers: qualifiers,
        },
        code: "loaded",
      });
    }

    return handleApiSuccess<CampaignLoaderData>({
      payload: {
        campaing,
        qualifiers: qualifiers,
      },
      code: "loaded",
    });
  } catch (error) {
    console.error("Error fetching qualifier:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}



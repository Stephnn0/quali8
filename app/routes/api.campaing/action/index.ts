import type { ActionFunctionArgs } from "@remix-run/node";
import { createCampaign } from "~/models/app.server/campaings";
import { authenticate } from "~/shopify.server";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";
import db from "app/db.server";

export default async function action({ request }: ActionFunctionArgs) {


    try {
        console.log("===========================campaing action===========================");
        const { session } = await authenticate.admin(request);
    
        const formData = await request.formData();
    
        const body = formData.get("body") as string;
    
        const parsedBody = JSON.parse(body);

            console.log('--------------------------------parsedBody:', parsedBody);

            if (request.method === "POST") {

                const data: Parameters<typeof createCampaign>[0]["data"] = {
                    name: parsedBody.name,
                    status: parsedBody.status,
                    startAt: parsedBody.startAt,
                    endAt: parsedBody.endAt,
                    shopifyStore: { connect: { shop: session.shop } },
                    //
                    audiences: { connect: parsedBody.audiences.map((audience: string) => ({ id: Number(audience) })) },
                };

                const campaign = await createCampaign({ data }, db);
                return { status: "success", campaign };

            }
            return { status: "error" };

    } catch (error) {
        return handleApiError({ errors: error, code: "error" });
    }

}

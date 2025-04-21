import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);
  console.log("parsedBody", parsedBody);

  try {
    if (request.method === "DELETE") {
      console.log("-----------------delete------------");

      return { payload: "success" };
    }

    return null; // ! fixed to error
  } catch (error) {
    console.error("Error in action:", error);
  }
}

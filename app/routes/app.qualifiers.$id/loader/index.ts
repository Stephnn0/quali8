import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifierById } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const id = String(params.id || "");

  if (id === "new") {
    return {
      payload: {
        qualifier: null,
      },
      code: "new",
    };
  }

  try {
    const qualifier = await getQualifierById(
      { where: { id: Number(params.id), shop: session.shop } },
      db,
    );

    console.log("qualifier", qualifier);

    if (!qualifier)
      return { errors: ["Item not found"], code: "not-found", status: 404 };

    return {
      payload: { qualifier },
      code: "loaded",
    };
  } catch (error) {
    console.error("Error fetching qualifier:", error);
    return { errors: ["Item not found"], code: "not-found", status: 404 };
  }
}

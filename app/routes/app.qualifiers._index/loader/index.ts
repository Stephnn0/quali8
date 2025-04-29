import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const qualifiers = await getQualifiersByShop(
      {
        where: {
          shop: session.shop,
        },
        include: {
          customers: true,
          conditions: true,
        },
      },
      db,
    );

    return {
      payload: qualifiers,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

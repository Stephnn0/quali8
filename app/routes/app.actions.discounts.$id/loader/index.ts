import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";
import { getDeliveryProfiles } from "app/models/shopify.server/deliveryProfiles/deliveryProfiles.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const context = await authenticate.admin(request);

  try {
    const delivery = await getDeliveryProfiles(context.admin.graphql);

    console.log(JSON.stringify(delivery, null, 2), "delivery");

    const methodDefinitions: any = [];
    delivery?.nodes.forEach((node) => {
      node.profileLocationGroups.forEach((group) => {
        group.locationGroupZones.edges.forEach((edge) => {
          edge.node.methodDefinitions.edges.forEach((methodEdge) => {
            methodDefinitions.push(methodEdge.node);
          });
        });
      });
    });

    const qualifiers = await getQualifiersByShop(
      {
        where: {
          shop: context.session.shop,
        },

        include: {
          customers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
      db,
    );

    return {
      payload: qualifiers || [],
      rates: methodDefinitions,
    };
  } catch (error) {
    console.log(error);
  }
  return null;
}

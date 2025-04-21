import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";
import { getDeliveryProfiles } from "app/models/shopify.server/deliveryProfiles/deliveryProfiles.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const context = await authenticate.admin(request);

  try {
    const delivery = await getDeliveryProfiles(context.admin.graphql);

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

    // Filter out empty rateProviders and duplicate names
    const filteredMethodDefinitions = methodDefinitions
      .filter((method: any) => {
        return (
          method.rateProvider && Object.keys(method.rateProvider).length > 0
        );
      })
      .filter((method: any, index: any, self: any) => {
        return self.findIndex((m: any) => m.name === method.name) === index;
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
              shopifyId: true,
            },
          },
        },
      },
      db,
    );

    return {
      payload: qualifiers || [],
      rates: filteredMethodDefinitions,
    };
  } catch (error) {
    console.log(error);
  }
  return null;
}

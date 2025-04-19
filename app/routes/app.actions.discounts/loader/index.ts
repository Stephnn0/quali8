import type { LoaderFunctionArgs } from "@remix-run/node";
import { getDeliveryProfiles } from "app/models/shopify.server/deliveryProfiles/deliveryProfiles.server";
import { authenticate } from "app/shopify.server";

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

    const qualifiers: any[] = [];

    return {
      payload: qualifiers || [],
      rates: methodDefinitions,
    };
  } catch (error) {
    console.log(error);
  }
  return null;
}

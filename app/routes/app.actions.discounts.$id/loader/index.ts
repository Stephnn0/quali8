import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";
import { getDeliveryProfiles } from "app/models/shopify.server/deliveryProfiles/deliveryProfiles.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getActionShippingDiscount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import type { ActionShippingDiscountLoaderData } from "../types";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const context = await authenticate.admin(request);

  const id = String(params.id || "");

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

    if (id === "new") {
      return handleApiSuccess<ActionShippingDiscountLoaderData>({
        payload: {
          qualifiers: qualifiers,
          rates: filteredMethodDefinitions,
        },
        code: "new",
      });
    }

    const actionWithShippingDiscount = await getActionShippingDiscount(
      {
        where: { id: Number(id) },
      },
      db,
    );

    return handleApiSuccess<ActionShippingDiscountLoaderData>({
      payload: {
        qualifiers: qualifiers,
        rates: filteredMethodDefinitions,
        shippingDiscount: actionWithShippingDiscount,
      },
      code: "loaded",
    });
  } catch (error) {
    console.log(error);
  }
  return null;
}

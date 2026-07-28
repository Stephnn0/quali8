import type { ActionFunctionArgs } from "react-router";
import {
  createQualifier,
  deleteQualifier,
  updateQualifier,
} from "app/models/app.server/qualifiers/qualifier.server";
import db from "app/db.server";
import { authenticate } from "app/shopify.server";
import {
  createCondition,
  deleteManyConditions,
} from "app/models/app.server/conditions/conditions.server";
import { upsertCustomer } from "app/models/app.server/customers/customer.server";
import { refreshAudienceMembers } from "app/services/audiences/refreshAudienceMembers.server";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";


export default async function action({ request }: ActionFunctionArgs) {
  try {
    const authAdminContext = await authenticate.admin(request);
    const { session } = authAdminContext;

    const formData = await request.formData();

    const body = formData.get("body") as string;

    const parsedBody = JSON.parse(body);

    const { name, description, customers, conditions, conditionLogicType } =
      parsedBody;

    // Re-sync an audience's members from Shopify (see refreshAudienceMembers)
    if (request.method === "PATCH") {
      const { qualifierId } = parsedBody as { qualifierId: number };
      const memberCount = await refreshAudienceMembers(
        authAdminContext,
        Number(qualifierId),
        db,
      );
      if (memberCount === null) {
        return handleApiError({ errors: "Audience not found", code: "error" });
      }
      return { payload: { memberCount }, code: "refreshed" };
    }

    if (request.method === "POST") {
      // ! we first create the qualifier and then create and connect conditions and customers
      const data: Parameters<typeof createQualifier>[0]["data"] = {
        name,
        description,
        conditionLogicType,
        // The editor saves the freshly previewed member list
        lastSyncedAt: new Date(),
        shopifyStore: { connect: { shop: session.shop } },
      };

      const qualifier = await createQualifier({ data }, db);

      if (qualifier) {
        for (const condition of conditions) {
          await createCondition(
            {
              data: {
                type: condition.type,
                comparisonType: condition.comparisonType,
                value: condition.value,
                qualifier: { connect: { id: qualifier?.id } },
                shopifyStore: { connect: { shop: session.shop } },
              },
            },
            db,
          );
        }

        for (const customer of customers) {
          await upsertCustomer(db, {
            shopifyId: customer.shopifyId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            amountSpent: customer.amountSpent,
            orderCount: customer.orderCount,
            country: customer.country,
            shop: session.shop,
            qualifierId: qualifier?.id,
          });
        }
      }

      return { status: "success", qualifier };
    }

    if (request.method === "PUT") {
      const updatedQualifier = await updateQualifier(
        {
          where: { id: parsedBody.id, shop: session.shop },
          data: {
            name: parsedBody.name,
            description: parsedBody.description,
            conditionLogicType: parsedBody.conditionLogicType,
            // Replace the member snapshot: detach everyone, reconnect below.
            // Previously stale members stayed attached forever.
            customers: { set: [] },
            lastSyncedAt: new Date(),
          },
        },
        db,
      );

      if (updatedQualifier) {
        // Must complete before re-creating conditions below, or the delete can
        // race the inserts and wipe the freshly created rows.
        await deleteManyConditions(
          {
            where: {
              qualifierId: updatedQualifier?.id,
              shopifyStore: { shop: session.shop },
            },
          },
          db,
        );

        for (const condition of conditions) {
          await createCondition(
            {
              data: {
                type: condition.type,
                comparisonType: condition.comparisonType,
                value: condition.value,
                qualifier: { connect: { id: updatedQualifier.id } },
                shopifyStore: { connect: { shop: session.shop } },
              },
            },
            db,
          );
        }

        // 3. Upsert customers
        for (const customer of customers) {
          await upsertCustomer(db, {
            shopifyId: customer.shopifyId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            amountSpent: customer.amountSpent,
            orderCount: customer.orderCount,
            country: customer.country,
            shop: session.shop,
            qualifierId: updatedQualifier.id,
          });
        }
      }

      return { status: "updated", updatedQualifier };
    }

    if (request.method === "DELETE") {
      const qualifierId = Number(parsedBody.qualifierId);

      // Ownership check — without it any authenticated shop could delete
      // another shop's audience by guessing ids.
      const owned = await db.qualifiers.findFirst({
        where: { id: qualifierId, shop: session.shop },
        select: { id: true },
      });
      if (!owned) {
        return handleApiError({ errors: "Audience not found", code: "error" });
      }

      await deleteManyConditions(
        {
          where: {
            qualifierId: owned.id,
            shopifyStore: { shop: session.shop },
          },
        },
        db,
      );
      await deleteQualifier({ where: { id: owned.id } }, db);

      return { payload: "deleted success" };
    }

    return { status: "error" };
  } catch (error) {
    console.error("API Qualifiers Action Error: ", error);
    return handleApiError({ errors: error, code: "error" });
  }
}

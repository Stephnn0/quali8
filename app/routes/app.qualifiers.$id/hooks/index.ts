import type { Conditions } from "@prisma/client";
import { LogicType } from "@prisma/client";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";
import type { loader } from "../loader";
import action from "../../api.qualifiers/action/index";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  createQualifierSchema,
  updateQualifierSchema,
} from "app/routes/api.qualifiers/zod";
import { useEffect, useState } from "react";
import { ZodError } from "zod";

export type QualifierForm = ReturnType<typeof useQualifierForm>;

export type CustomerSegment = {
  shopifyId: string;
  firstName: string;
  createdAt: string;
  country: string;
  amountSpent: number;
  orderCount: number;
};

export function useQualifierForm() {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const loaderData = useLoaderData<typeof loader>();

  const qualifier = loaderData?.payload?.qualifier;
  const { name, description, conditionLogicType, conditions, customers } =
    qualifier || {};

  const [errorName, setErrorName] = useState<string | null>(null);

  const refactorCustomers = customers?.map((customer) => ({
    shopifyId: customer.shopifyId,
    firstName: customer.firstName || "",
    country: customer.country || "",
    orderCount: customer.orderCount || 0,
    amountSpent:
      typeof customer.amountSpent === "string"
        ? parseFloat(customer.amountSpent)
        : customer.amountSpent || 0.0,
    createdAt: "",
  }));

  const form = useForm({
    fields: {
      name: useField(name || ""),
      description: useField(description || ""),
      //
      customers: useField<CustomerSegment[]>(refactorCustomers || []),

      ConditionLogicType: useField<LogicType>(
        conditionLogicType || LogicType.AND,
      ),
      //
      formConditions: useField<Conditions[]>(
        Array.isArray(conditions) ? conditions : [],
      ),
    },
    makeCleanAfterSubmit: false,
    onSubmit: async (fieldValues) => {
      setErrorName(null);
      try {
        if (!qualifier) {
          const body = {
            action: "CREATE",
            name: fieldValues.name,
            description: fieldValues.description,
            customers: fieldValues.customers,
            conditions: fieldValues.formConditions,
            conditionLogicType: fieldValues.ConditionLogicType,
          };

          createQualifierSchema.parse(body);

          fetcher.submit(
            { body: JSON.stringify(body) },
            {
              method: "POST",
              encType: "multipart/form-data",
              action: "/api/qualifiers",
            },
          );
        } else {
          console.log("update");

          const updateBody = {
            action: "UPDATE",
            id: qualifier.id,
            name: fieldValues.name,
            description: fieldValues.description,
            customers: fieldValues.customers,
            conditions: fieldValues.formConditions,
            conditionLogicType: fieldValues.ConditionLogicType,
          };

          updateQualifierSchema.parse(updateBody);

          fetcher.submit(
            { body: JSON.stringify(updateBody) },
            {
              method: "PUT",
              encType: "multipart/form-data",
              action: "/api/qualifiers",
            },
          );
        }
      } catch (error) {
        shopify.toast.show("Something went wrong");

        if (error instanceof ZodError) {
          error.errors.forEach((err) => {
            if (err.path.includes("name")) {
              setErrorName(err.message);
            }
          });
        }

        return { status: "success" };
      }

      return { status: "success" };
    },
  });

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (
        "errors" in fetcher.data &&
        Array.isArray(fetcher.data.errors) &&
        fetcher.data.errors.length
      ) {
        shopify.toast.show(
          `Error: ${fetcher.data.errors[0]?.message}` || "An error occurred",
        );
      } else {
        if ("code" in fetcher.data) {
          const actionCode = fetcher.data.code;
          if (actionCode === "created") {
            shopify.toast.show("Qualifier Created");
          } else if (actionCode === "updated") {
            shopify.toast.show("Qualifier Updated");
          }
        }
        navigate("/app/qualifiers");
      }
    }
  }, [fetcher.state, fetcher.data]);

  return {
    ...form,
    fetcher,
    errorName,
  };
}

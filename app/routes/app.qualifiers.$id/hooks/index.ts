import type { Conditions } from "@prisma/client";
import { LogicType } from "@prisma/client";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";
import type { loader } from "../loader";

export type QualifierForm = ReturnType<typeof useQualifierForm>;

type CustomerSegment = {
  id: string;
  firstName: string;
};

export function useQualifierForm() {
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const loaderData = useLoaderData<typeof loader>();

  const qualifier = loaderData?.payload.qualifier;

  const { name, description, conditionLogicType, conditions } = qualifier || {};

  const form = useForm({
    fields: {
      name: useField(name || ""),
      description: useField(description || ""),
      //
      customers: useField<CustomerSegment[]>([]),
      ConditionLogicType: useField<LogicType>(
        conditionLogicType || LogicType.AND,
      ),
      //
      formConditions: useField<Conditions[]>(conditions || []),
    },
    makeCleanAfterSubmit: true,
    onSubmit: async (fieldValues) => {
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

          fetcher.submit(
            { body: JSON.stringify(body) },
            {
              method: "POST",
              encType: "multipart/form-data",
              action: "/api/qualifiers",
            },
          );

          navigate("/app/qualifiers");
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
        return { status: "success" };
      }

      return { status: "success" };
    },
  });

  return {
    ...form,
  };
}

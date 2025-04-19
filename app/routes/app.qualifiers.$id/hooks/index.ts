import type { Conditions } from "@prisma/client";
import { LogicType } from "@prisma/client";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";

export type QualifierForm = ReturnType<typeof useQualifierForm>;

type CustomerSegment = {
  id: string;
  firstName: string;
};

export function useQualifierForm() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const isNew = true;

  const form = useForm({
    fields: {
      name: useField(""),
      description: useField(""),
      //
      customers: useField<CustomerSegment[]>([]),
      ConditionLogicType: useField<LogicType>(LogicType.AND),
      //
      formConditions: useField<Conditions[]>([]),
    },
    makeCleanAfterSubmit: true,
    onSubmit: async (fieldValues) => {
      const body = {
        name: fieldValues.name,
        description: fieldValues.description,
        customers: fieldValues.customers,
        conditions: fieldValues.formConditions,
        conditionLogicType: fieldValues.ConditionLogicType,
      };

      try {
        if (isNew) {
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

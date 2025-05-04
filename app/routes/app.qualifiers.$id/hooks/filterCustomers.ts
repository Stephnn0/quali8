import type { Conditions } from "@prisma/client";
import { LogicType } from "@prisma/client";
import { useFetcher } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";
import type action from "../../api.shopifyCustomers/action";
import { conditionsSubmissionSchema } from "./zod";
import { ZodError } from "zod";
import { useState } from "react";

export { action };

export type FilterCustomersForm = ReturnType<typeof useFilterCustomersForm>;

export function useFilterCustomersForm() {
  const [error, setError] = useState<string | null>(null);

  const fetcher = useFetcher<typeof action>();

  const form = useForm({
    fields: {
      //
      ConditionLogicTypeCustomer: useField<LogicType>(LogicType.AND),
      //
      formConditions: useField<Conditions[]>([]),
    },
    makeCleanAfterSubmit: false,
    onSubmit: async (fieldValues) => {
      setError(null);
      try {
        const body = {
          conditions: fieldValues.formConditions,
          conditionLogicType: fieldValues.ConditionLogicTypeCustomer,
        };

        conditionsSubmissionSchema.parse(body);

        fetcher.submit(
          { body: JSON.stringify(body) },
          {
            method: "post",
            action: "/api/shopifyCustomers",
            encType: "multipart/form-data",
          },
        );
      } catch (error) {
        if (error instanceof ZodError) {
          error.errors.forEach((err) => {
            if (err.path.includes("conditions")) {
              setError(err.message);
            }
          });
        }

        shopify.toast.show("Some Error Occured");

        return { status: "success" };
      }

      return { status: "success" };
    },
  });

  return {
    ...form,
    fetcher,
    error,
  };
}

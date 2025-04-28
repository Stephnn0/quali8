import type { Conditions } from "@prisma/client";
import { LogicType } from "@prisma/client";
import { useFetcher } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";
import type action from "../../api.shopifyCustomers/action";
import { conditionsSubmissionSchema } from "./zod";

export { action };

export type FilterCustomersForm = ReturnType<typeof useFilterCustomersForm>;

export function useFilterCustomersForm() {
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
      const body = {
        conditions: fieldValues.formConditions,
        conditionLogicType: fieldValues.ConditionLogicTypeCustomer,
      };
      console.log("---------before------------");

      conditionsSubmissionSchema.parse(body);

      console.log("---------body------------", body);

      try {
        // fetcher.submit(
        //   { body: JSON.stringify(body) },
        //   {
        //     method: "post",
        //     action: "/api/shopifyCustomers",
        //     encType: "multipart/form-data",
        //   },
        // );
      } catch (error) {
        console.log("---------error------------", error);
        return { status: "success" };
      }

      return { status: "success" };
    },
  });

  return {
    ...form,
    fetcher,
  };
}

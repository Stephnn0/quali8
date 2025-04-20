import { useFetcher, useNavigate } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";

export type DiscountForm = ReturnType<typeof useDiscountForm>;

export function useDiscountForm() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const isNew = true;

  const form = useForm({
    fields: {
      automaticOrCode: useField("CODE"),
      code: useField(""),
      type: useField("percentage"),
      valueType: useField(""),

      customers: useField<string[]>([]),
      qualifiersIds: useField<string[]>([]),
      //
      shippingRateType: useField("ALL_RATES"),
      shippingRatesIds: useField<string[]>([]),
      //
      startDate: useField(""),
      startTime: useField(""),
      endDate: useField(""),
      endTime: useField(""),
      hasEndDate: useField(false),
    },
    makeCleanAfterSubmit: true,
    onSubmit: async (fieldValues) => {
      const body = {
        automaticOrCode: fieldValues.automaticOrCode,
        codeOrName: fieldValues.code,
        type: fieldValues.type,
        value: fieldValues.valueType,
        customers: fieldValues.customers,
        //
        shippingRateType: fieldValues.shippingRateType,
        shippingRatesIds: fieldValues.shippingRatesIds,

        startDate: fieldValues.startDate,
        startTime: fieldValues.startTime,
        hasEndDate: fieldValues.hasEndDate,
        endDate: fieldValues.endDate,
        endTime: fieldValues.endTime,
      };

      try {
        if (isNew) {
          console.log("post");

          fetcher.submit(
            { body: JSON.stringify(body) },
            {
              method: "POST",
              encType: "multipart/form-data",
              action: "/api/actions/discounts",
            },
          );

          navigate("/app/actions");
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

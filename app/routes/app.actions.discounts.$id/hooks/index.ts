import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useField, useForm } from "@shopify/react-form";
import type { loader } from "../loader";

export type DiscountForm = ReturnType<typeof useDiscountForm>;

export function useDiscountForm() {
  const loaderData = useLoaderData<typeof loader>();

  const shippingDiscount = loaderData?.payload.action;

  const {
    id,
    marketingActionId,
    shopifyDiscountId,
    //
    automaticOrCode,
    codeOrName,
    type,
    value,
    //
    shippingRateType,
    shippingRatesIds,
    //
    startDate,
    startTime,
    hasEndDate,
    endDate,
    endTime,
  } = shippingDiscount || {};

  const navigate = useNavigate();
  const fetcher = useFetcher();

  const form = useForm({
    fields: {
      automaticOrCode: useField(automaticOrCode || "CODE"),
      code: useField(codeOrName || ""),
      type: useField(type || "percentage"),
      valueType: useField(value || ""),

      customers: useField<string[]>([]),
      qualifiersIds: useField<string[]>([]),
      //
      shippingRateType: useField(shippingRateType || "ALL_RATES"),
      shippingRatesNames: useField<string[]>(shippingRatesIds || []),
      //
      startDate: useField(startDate || ""),
      startTime: useField(startTime || ""),
      endDate: useField(endDate || ""),
      endTime: useField(endTime || ""),
      hasEndDate: useField(hasEndDate || false),
    },
    makeCleanAfterSubmit: true,
    onSubmit: async (fieldValues) => {
      const body = {
        automaticOrCode: fieldValues.automaticOrCode,
        codeOrName: fieldValues.code,
        type: fieldValues.type,
        value: fieldValues.valueType,
        customers: fieldValues.customers,
        qualifiersIds: fieldValues.qualifiersIds,
        //
        shippingRateType: fieldValues.shippingRateType,
        shippingRatesNames: fieldValues.shippingRatesNames,
        //
        startDate: fieldValues.startDate,
        startTime: fieldValues.startTime,
        hasEndDate: fieldValues.hasEndDate,
        endDate: fieldValues.endDate,
        endTime: fieldValues.endTime,
      };

      try {
        if (!shippingDiscount) {
          console.log("post");
          console.log("----------------body--------------", body);

          // fetcher.submit(
          //   { body: JSON.stringify(body) },
          //   {
          //     method: "POST",
          //     encType: "multipart/form-data",
          //     action: "/api/actions/discounts",
          //   },
          // );

          navigate("/app/actions/discounts");
        } else {
          console.log("update");

          const updateBody = {
            id: id,
            shopifyDiscountId: shopifyDiscountId,
            marketingActionId: marketingActionId,
            //
            automaticOrCode: fieldValues.automaticOrCode,
            codeOrName: fieldValues.code,
            type: fieldValues.type,
            value: fieldValues.valueType,
            customers: fieldValues.customers,
            qualifiersIds: fieldValues.qualifiersIds,
            //
            shippingRateType: fieldValues.shippingRateType,
            shippingRatesNames: fieldValues.shippingRatesNames,
            //
            startDate: fieldValues.startDate,
            startTime: fieldValues.startTime,
            hasEndDate: fieldValues.hasEndDate,
            endDate: fieldValues.endDate,
            endTime: fieldValues.endTime,
          };

          fetcher.submit(
            { body: JSON.stringify(updateBody) },
            {
              method: "PUT",
              encType: "multipart/form-data",
              action: `/api/actions/discounts`,
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

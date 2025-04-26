import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  lengthMoreThan,
  notEmpty,
  positiveIntegerString,
  useField,
  useForm,
} from "@shopify/react-form";
import type { loader } from "../loader";
import { useAppBridge } from "@shopify/app-bridge-react";
import type {
  CreateBody,
  Customer,
} from "app/routes/api.actions.discounts/zod";
import { zodApiActionsShippingDiscounts } from "app/routes/api.actions.discounts/zod";

export type DiscountForm = ReturnType<typeof useDiscountForm>;

export function useDiscountForm() {
  const loaderData = useLoaderData<typeof loader>();

  const shippingDiscount = loaderData?.payload.shippingDiscount;

  const {
    id,
    shopifyDiscountId,
    //
    automaticOrCode,
    codeOrName,
    type,
    value,
    //
    shippingRateType,
    shippingRatesNames,
    qualifierIds,
    //
    startDate,
    startTime,
    hasEndDate,
    endDate,
    endTime,
    //
    shippingDiscountState,
    limitUsagePerOneCustomer,
    combinedWithOrderDiscounts,
    combinedWithProductDiscounts,
  } = shippingDiscount || {};

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const form = useForm({
    fields: {
      shippingDiscountState: useField(shippingDiscountState || "ENABLED"),
      //
      limitUsagePerOneCustomer: useField(limitUsagePerOneCustomer || false),
      combinedWithOrderDiscounts: useField(combinedWithOrderDiscounts || false),
      combinedWithProductDiscounts: useField(
        combinedWithProductDiscounts || false,
      ),
      //
      automaticOrCode: useField<"AUTOMATIC" | "CODE">(
        (automaticOrCode as "AUTOMATIC" | "CODE") || "CODE",
      ),
      code: useField({
        value: codeOrName || "",
        validates: [notEmpty("Code is required")],
      }),

      type: useField(type || "percentage"),
      valueType: useField({
        value: value || "",
        validates: [positiveIntegerString("Value is required")],
      }),

      customers: useField<Customer[]>({
        value: [],
        validates: [lengthMoreThan(0, "Customers is required")],
      }),
      qualifierIds: useField<number[]>(qualifierIds || []),
      //
      shippingRateType: useField(shippingRateType || "ALL_RATES"),
      shippingRatesNames: useField<string[]>(shippingRatesNames || []),
      //
      startDate: useField(startDate || ""),
      startTime: useField(startTime || ""),
      endDate: useField(endDate || ""),
      endTime: useField(endTime || ""),
      hasEndDate: useField(hasEndDate || false),
    },
    makeCleanAfterSubmit: true,
    onSubmit: async (fieldValues) => {
      try {
        if (!shippingDiscount) {
          console.log("post");

          const body: CreateBody = {
            action: "create", // (1
            //
            shippingDiscountState: fieldValues.shippingDiscountState, // (2 DISABLED, ENABLED
            codeOrName: fieldValues.code, // (3
            //
            limitUsagePerOneCustomer: fieldValues.limitUsagePerOneCustomer, // (4
            //
            type: fieldValues.type, // (5 percentage or fixed
            value: fieldValues.valueType, // (6
            //
            combinedWithOrderDiscounts: fieldValues.combinedWithOrderDiscounts, // (7
            combinedWithProductDiscounts:
              fieldValues.combinedWithProductDiscounts, // (8
            //
            automaticOrCode: fieldValues.automaticOrCode, // (9
            //
            customers: fieldValues.customers, // (10
            qualifierIds: fieldValues.qualifierIds, // (11
            //
            shippingRateType: fieldValues.shippingRateType, // (12 ALL_RATES or CUSTOMED_RATES
            shippingRatesNames: fieldValues.shippingRatesNames, // (13
            //
            startDate: fieldValues.startDate, // (14
            startTime: fieldValues.startTime, // (15
            hasEndDate: fieldValues.hasEndDate, // (16
            endDate: fieldValues.endDate, // (17
            endTime: fieldValues.endTime, // (18
          };

          console.log(body, "body");

          const bodyParsed = zodApiActionsShippingDiscounts.create.parse(body);

          console.log(bodyParsed, "----------bodyParsed-----------");

          fetcher.submit(bodyParsed as any, {
            method: "POST",
            encType: "application/json",
            action: "/api/actions/discounts",
          });

          shopify.toast.show("Discount Created");

          navigate("/app/actions/discounts");
        } else {
          console.log("update");

          const updateBody = {
            action: "update",
            //
            id: id,
            shopifyDiscountId: shopifyDiscountId,
            //
            shippingDiscountState: fieldValues.shippingDiscountState,
            limitUsagePerOneCustomer: fieldValues.limitUsagePerOneCustomer,
            combinedWithOrderDiscounts: fieldValues.combinedWithOrderDiscounts,
            combinedWithProductDiscounts:
              fieldValues.combinedWithProductDiscounts,
            //
            automaticOrCode: fieldValues.automaticOrCode,
            codeOrName: fieldValues.code,
            type: fieldValues.type,
            value: fieldValues.valueType,
            customers: fieldValues.customers,
            //
            qualifierIds: fieldValues.qualifierIds,
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
              encType: "application/json",
              action: `/api/actions/discounts`,
            },
          );

          shopify.toast.show("Discount Updated");
          navigate("/app/actions/discounts");
        }
      } catch (error) {
        console.log(
          error,
          "-----------------------------------------error------------",
        );
        shopify.toast.show("Some Error Occured");

        return { status: "success" };
      }

      return { status: "success" };
    },
  });

  return {
    ...form,
  };
}

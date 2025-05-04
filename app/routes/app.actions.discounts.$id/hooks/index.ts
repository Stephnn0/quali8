import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  lengthMoreThan,
  notEmpty,
  useField,
  useForm,
} from "@shopify/react-form";
import type { loader } from "../loader";
import { useAppBridge } from "@shopify/app-bridge-react";
import type {
  CreateBody,
  Customer,
  UpdateBody,
} from "app/routes/api.actions.discounts/zod";
import { zodApiActionsShippingDiscounts } from "app/routes/api.actions.discounts/zod";
import { useState } from "react";
import { ZodError } from "zod";

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

  // Error states
  const [valueError, setValueError] = useState<string | null>(null);
  const [qualifierIdsError, setQualifierIdsError] = useState<string | null>(
    null,
  );

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
      valueType: useField(value || 0),

      customers: useField<Customer[]>({
        value: [],
        validates: [lengthMoreThan(0, "Customers is required")],
      }),
      qualifierIds: useField<string[]>({
        value: qualifierIds || [],
        validates: [lengthMoreThan(0, "Qualifiers are required")],
      }),
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
    makeCleanAfterSubmit: false, // ! FIXED THIS: ONLY CLEN ON SUCESSFUL SUBMITIONS
    onSubmit: async (fieldValues) => {
      setValueError(null);
      setQualifierIdsError(null);

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

          console.log("bodyParsed", body);

          const bodyParsed = zodApiActionsShippingDiscounts.create.parse(body);

          fetcher.submit(bodyParsed as any, {
            method: "POST",
            encType: "application/json",
            action: "/api/actions/discounts",
          });

          shopify.toast.show("Discount Created");

          navigate("/app/actions/discounts");
        } else {
          console.log("update");

          const body: UpdateBody = {
            action: "update", // (1
            //
            id: id!, // (2
            shopifyDiscountId: shopifyDiscountId!, // (3
            //
            shippingDiscountState: fieldValues.shippingDiscountState, // (4
            codeOrName: fieldValues.code, // (5
            //
            limitUsagePerOneCustomer: fieldValues.limitUsagePerOneCustomer, // (5
            //
            type: fieldValues.type, // (7
            value: fieldValues.valueType, // (8
            //
            combinedWithOrderDiscounts: fieldValues.combinedWithOrderDiscounts, // (9
            combinedWithProductDiscounts:
              fieldValues.combinedWithProductDiscounts, // (10
            //
            automaticOrCode: fieldValues.automaticOrCode, // (11
            //
            customers: fieldValues.customers, // (12
            qualifierIds: fieldValues.qualifierIds, // (13
            //
            shippingRateType: fieldValues.shippingRateType, // (14
            shippingRatesNames: fieldValues.shippingRatesNames, // (15
            //
            startDate: fieldValues.startDate, // (16
            startTime: fieldValues.startTime, // (17
            hasEndDate: fieldValues.hasEndDate, // (18
            endDate: fieldValues.endDate, // (19
            endTime: fieldValues.endTime, // (20
          };

          const bodyParsed = zodApiActionsShippingDiscounts.update.parse(body);

          fetcher.submit(bodyParsed as any, {
            method: "PUT",
            encType: "application/json",
            action: `/api/actions/discounts`,
          });

          shopify.toast.show("Discount Updated");

          navigate("/app/actions/discounts");
        }
      } catch (error) {
        if (error instanceof ZodError) {
          error.errors.forEach((err) => {
            if (err.path.includes("value")) {
              setValueError(err.message); // Set the value error
            } else if (err.path.includes("qualifierIds")) {
              setQualifierIdsError(err.message); // Set the qualifierIds error
            }
          });
        }

        shopify.toast.show("Some Error Occured");

        return { status: "success", errors: { form: "Some Error Occured" } };
      }

      return { status: "success" };
    },
  });

  return {
    ...form,
    valueError,
    qualifierIdsError,
  };
}

import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { notEmpty, useField, useForm } from "@shopify/react-form";
import type { loader } from "../loader";
import { useAppBridge } from "@shopify/app-bridge-react";
import type {
  CreateBody,
  Customer,
  UpdateBody,
} from "app/routes/api.actions.discounts/zod";
import { zodApiActionsShippingDiscounts } from "app/routes/api.actions.discounts/zod";
import { useEffect, useState } from "react";
import { ZodError } from "zod";
import type action from "../../api.actions.discounts/action/index";

export type DiscountForm = ReturnType<typeof useDiscountForm>;

/** An audience (Qualifiers row) as the form needs it. */
export type AudienceOption = {
  id: number;
  name: string;
  customers: Customer[];
};

/** A shipping rate (delivery method definition) as the form needs it. */
export type RateOption = { id: string; name: string };

type FieldErrors = {
  value: string | null;
  qualifierIds: string | null;
  minimumCartValue: string | null;
};

const NO_ERRORS: FieldErrors = {
  value: null,
  qualifierIds: null,
  minimumCartValue: null,
};

export function useDiscountForm() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const shippingDiscount = loaderData?.payload?.shippingDiscount;

  // The loader includes each audience's customers; the include isn't
  // reflected in the generic Prisma return type, so narrow it here.
  const audiences = (loaderData?.payload?.qualifiers?.qualifiers ??
    []) as unknown as AudienceOption[];
  const rates: RateOption[] = (loaderData?.payload?.rates ?? []).map(
    (rate: { id: string; name: string }) => ({ id: rate.id, name: rate.name }),
  );

  const {
    id,
    shopifyDiscountId,
    automaticOrCode,
    codeOrName,
    type,
    value,
    shippingRateType,
    shippingRatesNames,
    qualifierIds,
    appliesToAllCustomers,
    isMinimumCartValueEnabled,
    minimumCartValue,
    startDate,
    startTime,
    hasEndDate,
    endDate,
    endTime,
    shippingDiscountState,
    limitUsagePerOneCustomer,
    combinedWithOrderDiscounts,
    combinedWithProductDiscounts,
  } = shippingDiscount || {};

  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);

  const form = useForm({
    fields: {
      shippingDiscountState: useField<"ENABLED" | "DISABLED">(
        shippingDiscountState || "ENABLED",
      ),
      limitUsagePerOneCustomer: useField(limitUsagePerOneCustomer || false),
      combinedWithOrderDiscounts: useField(combinedWithOrderDiscounts || false),
      combinedWithProductDiscounts: useField(
        combinedWithProductDiscounts || false,
      ),
      automaticOrCode: useField<"AUTOMATIC" | "CODE">(
        (automaticOrCode as "AUTOMATIC" | "CODE") || "CODE",
      ),
      code: useField({
        value: codeOrName || "",
        validates: [notEmpty("Enter a code or name for this discount")],
      }),
      type: useField<"percentage" | "fixed">(type || "percentage"),
      valueType: useField<number>(value ?? 100),
      appliesToAllCustomers: useField(appliesToAllCustomers || false),
      isMinimumCartValueEnabled: useField(isMinimumCartValueEnabled || false),
      minimumCartValue: useField<number>(minimumCartValue || 0),
      qualifierIds: useField<string[]>(qualifierIds || []),
      shippingRateType: useField<"ALL_RATES" | "SELECTED_RATES">(
        shippingRateType || "ALL_RATES",
      ),
      shippingRatesNames: useField<string[]>(shippingRatesNames || []),
      startDate: useField(startDate || ""),
      startTime: useField(startTime || ""),
      endDate: useField(endDate || ""),
      endTime: useField(endTime || ""),
      hasEndDate: useField(hasEndDate || false),
    },
    makeCleanAfterSubmit: false,
    onSubmit: async (fieldValues) => {
      setErrors(NO_ERRORS);

      // The function needs the concrete customer list. Derive it from the
      // chosen audiences at submit time so an edit that never reopens the
      // audience picker still carries the right customers.
      const customers: Customer[] = fieldValues.appliesToAllCustomers
        ? []
        : audiences
            .filter((audience) =>
              fieldValues.qualifierIds.includes(String(audience.id)),
            )
            .flatMap((audience) => audience.customers)
            .map((customer) => ({
              id: customer.id,
              shopifyId: customer.shopifyId,
            }));

      const shared = {
        shippingDiscountState: fieldValues.shippingDiscountState,
        codeOrName: fieldValues.code.trim(),
        limitUsagePerOneCustomer: fieldValues.limitUsagePerOneCustomer,
        type: fieldValues.type,
        value: fieldValues.valueType,
        combinedWithOrderDiscounts: fieldValues.combinedWithOrderDiscounts,
        combinedWithProductDiscounts: fieldValues.combinedWithProductDiscounts,
        automaticOrCode: fieldValues.automaticOrCode,
        customers,
        qualifierIds: fieldValues.appliesToAllCustomers
          ? []
          : fieldValues.qualifierIds,
        shippingRateType: fieldValues.shippingRateType,
        shippingRatesNames:
          fieldValues.shippingRateType === "SELECTED_RATES"
            ? fieldValues.shippingRatesNames
            : [],
        startDate: fieldValues.startDate,
        startTime: fieldValues.startTime,
        hasEndDate: fieldValues.hasEndDate,
        endDate: fieldValues.endDate,
        endTime: fieldValues.endTime,
        appliesToAllCustomers: fieldValues.appliesToAllCustomers,
        isMinimumCartValueEnabled: fieldValues.isMinimumCartValueEnabled,
        minimumCartValue: fieldValues.isMinimumCartValueEnabled
          ? fieldValues.minimumCartValue
          : 0,
      };

      try {
        if (!shippingDiscount) {
          const body: CreateBody = { action: "create", ...shared };
          const bodyParsed = zodApiActionsShippingDiscounts.create.parse(body);
          fetcher.submit(bodyParsed as any, {
            method: "POST",
            encType: "application/json",
            action: "/api/actions/discounts",
          });
        } else {
          const body: UpdateBody = {
            action: "update",
            id: id!,
            shopifyDiscountId: shopifyDiscountId!,
            ...shared,
          };
          const bodyParsed = zodApiActionsShippingDiscounts.update.parse(body);
          fetcher.submit(bodyParsed as any, {
            method: "PUT",
            encType: "application/json",
            action: "/api/actions/discounts",
          });
        }
      } catch (error) {
        if (error instanceof ZodError) {
          const next: FieldErrors = { ...NO_ERRORS };
          error.errors.forEach((issue) => {
            if (issue.path.includes("value")) next.value = issue.message;
            else if (issue.path.includes("qualifierIds"))
              next.qualifierIds = issue.message;
            else if (issue.path.includes("minimumCartValue"))
              next.minimumCartValue = issue.message;
          });
          setErrors(next);
          shopify.toast.show("Fix the highlighted fields to continue");
          return { status: "fail", errors: [{ message: "Validation failed" }] };
        }
        shopify.toast.show("Something went wrong");
        return { status: "fail", errors: [{ message: "Unknown error" }] };
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
          `Error: ${fetcher.data.errors[0]?.message ?? "An error occurred"}`,
        );
      } else {
        const actionCode =
          "code" in fetcher.data ? fetcher.data.code : undefined;
        if (actionCode === "created") {
          shopify.toast.show("Shipping discount created");
        } else if (actionCode === "updated") {
          shopify.toast.show("Shipping discount saved");
        }
        navigate("/app/actions/discounts");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  return {
    ...form,
    errors,
    audiences,
    rates,
    isNew: !shippingDiscount,
    submitting: fetcher.state !== "idle",
  };
}

import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";

export type ApiResponseCode =
  | "none"
  | "success"
  | "not-found"
  | "loaded"
  | "created"
  | "updated"
  | "upserted"
  | "deleted"
  | "connected"
  | "disconnected"
  | "duplicated"
  | "error"
  | "new"
  | "unauthorized"
  | (string & {});

export type UseShopifyParams = {
  code?: ApiResponseCode;
  eventID?: string | number;
  resource: ReturnToastFnParameters["0"];
  toast?: {
    default?:
      | {
          count?: ReturnToastFnParameters["2"];
          onShow?: () => void;
        }
      | boolean;
    custom?: {
      code?: ApiResponseCode;
      count?: ReturnToastFnParameters["2"];
      resource?: ReturnToastFnParameters["0"];
      onShow?: () => void;
    }[];
  };

  loading?: boolean;
};

export function useShopify(params?: UseShopifyParams) {
  const [previousEventID, setPreviousEventID] =
    useState<UseShopifyParams["eventID"]>(undefined);

  const shopify = useAppBridge();
  const { toast, eventID, code, resource, loading } = params || {};

  // # -------------------------- TOAST
  useEffect(() => {
    const defaultToast =
      typeof toast?.default === "object"
        ? { ...toast.default, code, resource }
        : toast?.default
          ? { code, resource }
          : undefined;

    const matchingToast =
      toast?.custom?.find((cToast) => cToast.code === code) || defaultToast;
    const matchingResource = matchingToast?.resource || resource;
    const isNewEvent = eventID !== previousEventID;

    if (matchingToast && matchingToast.code && matchingResource && isNewEvent) {
      const { onShow, count, code: matchingCode } = matchingToast;

      shopify.toast.show(...returnToast(matchingResource, matchingCode, count));
      onShow && onShow();
      setPreviousEventID(eventID);
    }
  }, [shopify, toast, code, resource, eventID, previousEventID]);

  // # -------------------------- LOADING
  useEffect(() => {
    shopify.loading(loading);
  }, [loading, shopify]);

  return shopify;
}

export type ReturnToastFnParameters = [
  resource: { singular: string; plural?: string },
  code: ApiResponseCode,
  count?: number,
];

type ReturnToastFn = (...args: ReturnToastFnParameters) => ToastParams;
type ToastParams = Parameters<ReturnType<typeof useAppBridge>["toast"]["show"]>;

export const returnToast: ReturnToastFn = (resource, code, count) => {
  const { singular, plural } = resource;
  const pluralizedResource =
    count && plural
      ? `${count} ${pluralize(count, singular, plural)}`
      : singular;

  // You can expand this however you want
  // * Ideas
  // - Use a translation library (i.e i18n) to translate the message
  // - Use singular and plural resources
  // - Use more switch statements for more complex cases
  // - Use a logger to log the message
  // - Pass onAction to the toast to handle the action via the toastConfig, basically you can control the entire config based on the params

  let toastMessage: ToastParams["0"];
  let toastConfig: ToastParams["1"] = {
    duration: 2000,
  };

  switch (code) {
    case "created":
      toastMessage = `${pluralizedResource} created successfully`;
      break;
    case "updated":
    case "upserted":
      toastMessage = `${pluralizedResource} updated successfully`;
      break;
    case "not-found":
      toastMessage = `${pluralizedResource} not found`;
      break;
    case "deleted":
      toastMessage = `${pluralizedResource} deleted successfully`;
      break;
    case "connected":
      toastMessage = `${pluralizedResource} connected successfully`;
      break;
    case "disconnected":
      toastMessage = `${pluralizedResource} disconnected successfully`;
      break;
    case "duplicated":
      toastMessage = `${pluralizedResource} duplicated successfully`;
      break;
    case "error":
      toastMessage = `An error occured. Retry or contact support`;
      toastConfig = {
        ...toastConfig,
        isError: true,
      };
      break;
    default:
      toastMessage = "Done!";
      break;
  }

  return [toastMessage, toastConfig];
};

function pluralize(
  count: number,
  singular: string,
  plural: string,
  zeroPlural: boolean = true,
) {
  return count > 1 || (zeroPlural && count === 0) ? plural : singular;
}

export default pluralize;

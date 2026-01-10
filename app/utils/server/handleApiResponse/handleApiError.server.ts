import { z } from "zod";
import type { BaseApiResponse, UnifiedResponseData } from "./types";

export const handleApiError: HandleApiErrorFn = ({
  status = 400,
  errors,
  headers,
  statusText,
  code = "none",
}) => {
  console.log("HandleApiError error typeof", typeof errors);

  let errorsArray: ApiError[] = [];

  if (errors instanceof z.ZodError) {
    console.log("HandleApiError type: z.ZodError:");
    console.log(errors.issues);

    errorsArray = errors.issues.map((error) => ({
      __typename: "ApiError",
      id: crypto.randomUUID(),
      type: "zod",
      path: error.path,
      message: error.message,
    }));
  } else if (errors instanceof Error) {
    console.log("HandleApiError type: Error", errors.message);

    errorsArray = [
      {
        __typename: "ApiError",
        id: crypto.randomUUID(),
        type: "error",
        message: errors.message,
      },
    ];
  } else {
    console.warn("HandleApiError type: Unknown", errors);

    errorsArray = [
      {
        __typename: "ApiError",
        id: crypto.randomUUID(),
        type: "unknown",
        message:
          typeof errors === "string"
            ? errors
            : typeof errors === "object" &&
                errors !== null &&
                "message" in errors
              ? String(errors.message)
              : "An unknown error occurred.",
      },
    ];
  }

  console.log(JSON.stringify(errorsArray, null, 2));

  return {
    errors: errorsArray,
    payload: null,
    code,
    id: Date.now(),
  };

}

// ------------------------------ Prototypes of Method
// ------------------------------
type HandleApiErrorFn = (
  params: HandleApiErrorFnParams,
) => UnifiedResponseData<null, ApiError[]>;

type HandleApiErrorFnParams = BaseApiResponse & {
  errors: any;
};

// ------------------------------ Types
// ------------------------------

export type ApiError = ApiErrorBase & (ZodApiError | OtherApiError);

type ApiErrorBase = {
  __typename: "ApiError";
  id: string;
  message: string;
};

type OtherApiError = {
  // separate this from the type as I did with ZodApiError if you need to add more properties depending on the type
  // 👇🏻 you can expand these codes to react however you want in the client
  type: "graphql" | "prisma" | "error" | "unknown";
};
// ------------------------------ Error Types

export type ZodApiError = {
  type: "zod";
  path: z.ZodError["issues"][number]["path"];
};

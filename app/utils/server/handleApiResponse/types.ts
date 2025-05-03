export type BaseApiResponse = {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  // 👇🏻 you can expand these codes to react anything you want in the client
  code: ApiResponseCode; // string & {} its a typescript utility to allow any string but still have the default values autocompleted
};

export type UnifiedResponseData<T, U> = {
  payload: T;
  errors: U;
  code: BaseApiResponse["code"];
  id: number;
};

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
  | "ordered"
  | (string & {});

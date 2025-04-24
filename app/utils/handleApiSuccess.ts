// Return type: UnifiedResponseData
type UnifiedResponseData<T, E = null> = {
  payload: T;
  errors: E;
  code: string;
  id: number;
};

// Parameters Type
type HandleApiSuccessFnParams<T> = {
  payload: T;
  status?: number; // ignored, since we just return plain object
  headers?: HeadersInit; // ignored
  statusText?: string; // ignored
  code?: string;
};

// Function Type
type HandleApiSuccessFn = <T>(
  params: HandleApiSuccessFnParams<T>,
) => UnifiedResponseData<T, null>;

// Function
export const handleApiSuccess: HandleApiSuccessFn = ({
  payload,
  code = "success",
}) => ({
  payload,
  errors: null,
  code,
  id: Date.now(),
});

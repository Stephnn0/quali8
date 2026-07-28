import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { loader } from "../loader";
import type apiAction from "../../api.qualifiers/action/index";
import type customersAction from "../../api.shopifyCustomers/action";
import {
  createQualifierSchema,
  updateQualifierSchema,
} from "app/routes/api.qualifiers/zod";
import { ZodError } from "zod";
import { comparisonTypeMap } from "../conditions/conditions";

export type LogicType = "AND" | "OR";

export type BuilderCondition = {
  /** Stable client-side key — never the array index. */
  key: string;
  id?: number;
  type: string;
  comparisonType: string;
  value: string;
};

export type CustomerSegment = {
  shopifyId: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  country: string;
  amountSpent: number;
  orderCount: number;
};

export type AudienceForm = ReturnType<typeof useAudienceForm>;

let keyCounter = 0;
const makeKey = () => `condition-${++keyCounter}`;

export const isComplete = (condition: BuilderCondition) =>
  Boolean(condition.type && condition.comparisonType && condition.value.trim());

const stripKeys = (conditions: BuilderCondition[]) =>
  conditions
    .filter(isComplete)
    .map(({ type, comparisonType, value }) => ({
      type,
      comparisonType,
      value: value.trim(),
    }));

type PreviewEdge = {
  node: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    createdAt?: string | null;
    numberOfOrders?: string | number | null;
    amountSpent?: { amount?: string | null } | null;
    defaultAddress?: { country?: string | null } | null;
  };
};

/**
 * The single source of truth for the audience editor: details, logic,
 * conditions, the live customer preview, and save. Replaces the previous
 * pair of parallel forms that each held their own copy of the conditions.
 */
export function useAudienceForm() {
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const loaderData = useLoaderData<typeof loader>();
  const qualifier = loaderData?.payload?.qualifier ?? null;

  const initial = useMemo(
    () => ({
      name: qualifier?.name ?? "",
      description: qualifier?.description ?? "",
      logic: (qualifier?.conditionLogicType as LogicType) ?? "AND",
      conditions: (qualifier?.conditions ?? []).map((condition) => ({
        key: makeKey(),
        id: condition.id,
        type: condition.type,
        comparisonType: condition.comparisonType,
        value: condition.value,
      })),
    }),
    [qualifier],
  );

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [logic, setLogic] = useState<LogicType>(initial.logic);
  const [conditions, setConditions] = useState<BuilderCondition[]>(
    initial.conditions,
  );
  const [nameError, setNameError] = useState<string | null>(null);

  // ---- Live preview -------------------------------------------------------

  const previewFetcher = useFetcher<typeof customersAction>();

  const initialCustomers: CustomerSegment[] = useMemo(
    () =>
      (qualifier?.customers ?? []).map((customer) => ({
        shopifyId: customer.shopifyId,
        firstName: customer.firstName ?? "",
        lastName: customer.lastName ?? "",
        createdAt: "",
        country: customer.country ?? "",
        orderCount: customer.orderCount ?? 0,
        amountSpent:
          typeof customer.amountSpent === "string"
            ? Number.parseFloat(customer.amountSpent) || 0
            : (customer.amountSpent ?? 0),
      })),
    [qualifier],
  );

  const [previewCustomers, setPreviewCustomers] =
    useState<CustomerSegment[]>(initialCustomers);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  const completeConditions = conditions.filter(isComplete);
  const completeSignature = JSON.stringify([stripKeys(conditions), logic]);

  const runPreview = useCallback(() => {
    const body = {
      conditions: stripKeys(conditions),
      conditionLogicType: logic,
    };
    if (body.conditions.length === 0) return;
    previewFetcher.submit(
      { body: JSON.stringify(body) },
      {
        method: "post",
        action: "/api/shopifyCustomers",
        encType: "multipart/form-data",
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeSignature]);

  // Auto-preview: debounce condition/logic changes once a condition is complete
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      // On edit, refresh the stored snapshot right away so the preview is live
      if (qualifier && completeConditions.length > 0) runPreview();
      return;
    }
    if (completeConditions.length === 0) return;
    const timeout = setTimeout(runPreview, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeSignature]);

  useEffect(() => {
    const data = previewFetcher.data;
    if (previewFetcher.state !== "idle" || !data) return;

    if ("errors" in data && Array.isArray(data.errors) && data.errors.length) {
      shopify.toast.show("Could not load matching customers");
      return;
    }
    if ("payload" in data && Array.isArray(data.payload)) {
      const mapped = (data.payload as PreviewEdge[]).map(({ node }) => ({
        shopifyId: node.id,
        firstName: node.firstName ?? "",
        lastName: node.lastName ?? "",
        createdAt: node.createdAt ?? "",
        country: node.defaultAddress?.country ?? "",
        amountSpent: Number.parseFloat(node.amountSpent?.amount ?? "0") || 0,
        orderCount: Number(node.numberOfOrders ?? 0),
      }));
      setPreviewCustomers(mapped);
      setHasPreviewed(true);
    }
  }, [previewFetcher.state, previewFetcher.data, shopify]);

  // ---- Condition helpers --------------------------------------------------

  const addCondition = () =>
    setConditions((prev) => [
      ...prev,
      { key: makeKey(), type: "", comparisonType: "", value: "" },
    ]);

  const removeCondition = (key: string) =>
    setConditions((prev) => prev.filter((condition) => condition.key !== key));

  const updateCondition = (
    key: string,
    patch: Partial<Pick<BuilderCondition, "type" | "comparisonType" | "value">>,
  ) =>
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.key !== key) return condition;
        const next = { ...condition, ...patch };
        if (patch.type !== undefined && patch.type !== condition.type) {
          next.comparisonType = comparisonTypeMap[patch.type]?.[0]?.value ?? "";
          next.value = "";
        }
        return next;
      }),
    );

  // ---- Save ---------------------------------------------------------------

  const saveFetcher = useFetcher<typeof apiAction>();

  const dirty =
    name !== initial.name ||
    description !== initial.description ||
    logic !== initial.logic ||
    JSON.stringify(stripKeys(conditions)) !==
      JSON.stringify(stripKeys(initial.conditions)) ||
    hasPreviewed;

  const submit = () => {
    setNameError(null);
    try {
      const shared = {
        name,
        description,
        customers: previewCustomers,
        conditions: stripKeys(conditions),
        conditionLogicType: logic,
      };

      if (!qualifier) {
        const body = { action: "CREATE", ...shared };
        createQualifierSchema.parse(body);
        saveFetcher.submit(
          { body: JSON.stringify(body) },
          {
            method: "POST",
            encType: "multipart/form-data",
            action: "/api/qualifiers",
          },
        );
      } else {
        const body = { action: "UPDATE", id: qualifier.id, ...shared };
        updateQualifierSchema.parse(body);
        saveFetcher.submit(
          { body: JSON.stringify(body) },
          {
            method: "PUT",
            encType: "multipart/form-data",
            action: "/api/qualifiers",
          },
        );
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const nameIssue = error.errors.find((issue) =>
          issue.path.includes("name"),
        );
        if (nameIssue) {
          setNameError(nameIssue.message);
          return;
        }
      }
      shopify.toast.show("Something went wrong");
    }
  };

  useEffect(() => {
    const data = saveFetcher.data;
    if (saveFetcher.state !== "idle" || !data) return;

    if ("errors" in data && Array.isArray(data.errors) && data.errors.length) {
      shopify.toast.show(`Error: ${data.errors[0]?.message ?? "unknown"}`);
      return;
    }
    shopify.toast.show(qualifier ? "Audience updated" : "Audience created");
    navigate("/app/qualifiers");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveFetcher.state, saveFetcher.data]);

  return {
    qualifier,
    // details
    name,
    setName,
    description,
    setDescription,
    nameError,
    // conditions
    logic,
    setLogic,
    conditions,
    addCondition,
    removeCondition,
    updateCondition,
    // preview
    previewCustomers,
    previewLoading: previewFetcher.state !== "idle",
    runPreview,
    completeConditionCount: completeConditions.length,
    // save
    submit,
    dirty,
    saving: saveFetcher.state !== "idle",
  };
}

import { useEffect, useState } from "react";
import type { loader } from "../loader";
import { lengthMoreThan, useField, useForm } from "@shopify/react-form";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import action from "../../api.campaing/action/index";

export type CampaingForm = ReturnType<typeof useCampaingForm>;

export type Customer = {
  shopifyId: string;
  id: number;
};


export function useCampaingForm() {
  const navigate = useNavigate();

  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [errorName, setErrorName] = useState<string | null>(null);

  const campaing = loaderData?.payload?.campaing;

  const { name, startAt, endAt, status, audiences } = campaing || {};

  const qualifierIds = audiences?.map((audience) => String(audience.id));

  const form = useForm({
    fields: {
      name: useField(name || ""),
      startAt: useField(startAt || ""),
      endAt: useField(endAt || ""),
      status: useField(status || "DRAFT"),
      //
      customers: useField<Customer[]>({
        value: [],
        validates: [lengthMoreThan(0, "Customers is required")],
      }),
      qualifierIds: useField<string[]>({
        value: qualifierIds || [],
        validates: [lengthMoreThan(0, "Qualifiers are required")],
      }),
    },
    makeCleanAfterSubmit: false,
    onSubmit: async (fieldValues) => {
      setErrorName(null);
      try {
        if (!campaing) {
          const body = {
            action: "CREATE",
            name: fieldValues.name,
            startAt: fieldValues.startAt,
            endAt: fieldValues.endAt,
            status: fieldValues.status,
            audiences: fieldValues.qualifierIds,
          };

          console.log('-------------------------body:', body);

          //   createQualifierSchema.parse(body);

          fetcher.submit(
            { body: JSON.stringify(body) },
            {
              method: "POST",
              encType: "multipart/form-data",
              action: "/api/campaing",
            },
          );
        } else {
          console.log("update");

          const updateBody = {
            action: "UPDATE",
            id: campaing.id,
            name: fieldValues.name,
            startAt: fieldValues.startAt,
            endAt: fieldValues.endAt,
            status: fieldValues.status,
            audiences: fieldValues.qualifierIds,
          };

          console.log('updateBody:', updateBody);

          //   updateQualifierSchema.parse(updateBody);

          fetcher.submit(
            { body: JSON.stringify(updateBody) },
            {
              method: "PUT",
              encType: "multipart/form-data",
              action: "/api/campaing",
            },
          );
        }
      } catch (error) {
        shopify.toast.show("Something went wrong");

        // if (error instanceof ZodError) {
        //   error.errors.forEach((err) => {
        //     if (err.path.includes("name")) {
        //       setErrorName(err.message);
        //     }
        //   });
        // }

        return { status: "success" };
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
          `Error: ${fetcher.data.errors[0]?.message}` || "An error occurred",
        );
      } else {
        if ("code" in fetcher.data) {
          const actionCode = fetcher.data.code;
          if (actionCode === "created") {
            shopify.toast.show("Campaing Created");
          } else if (actionCode === "updated") {
            shopify.toast.show("Campaing Updated");
          }
        }
         navigate("/app/campaings");
      }
    }
  }, [fetcher.state, fetcher.data]);

  return {
    ...form,
    errorName,
  };
}

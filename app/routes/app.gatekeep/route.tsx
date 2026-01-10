import { useLoaderData } from "react-router";
import { loader } from "./loader";
import { codeMap } from "./codeMap";
import { Page } from "@shopify/polaris";
import { FullPageCardErrorState } from "app/components/FullPageCard/variants/FullPageCardErrorState";

export { loader };

export default function GateKeep() {
  const { payload: loaderPayload } = useLoaderData<typeof loader>();

  const {
    page,
    card: { image, action, heading, children, secondaryAction },
  } = codeMap(loaderPayload?.code);

  return (
    <>
      <Page
        fullWidth
        title={page.title}
        subtitle={page.subtitle}
        backAction={{ url: "/app" }}
      />

      <FullPageCardErrorState
        action={action}
        image={image}
        heading={heading}
        secondaryAction={secondaryAction}
      >
        {children}
      </FullPageCardErrorState>
    </>
  );
}

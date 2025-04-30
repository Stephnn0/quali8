import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Card,
  InlineStack,
  ResourceList,
  type ResourceListProps,
} from "@shopify/polaris";
import { useMemo, type ReactNode } from "react";
import type { loader } from "../../route";
import styles from "./styles.module.css";
import PlainEmptyState from "app/components/PlainEmptyState/PlainEmptyState";

export type SplitListItem = {
  id: string;
  name: string;
};

type SplitListProps = {
  divider: ReactNode;
  length: number;
  resourceName: ResourceListProps["resourceName"];
  items: SplitListItem[];
  renderItem: ResourceListProps["renderItem"];
  emptyState: ResourceListProps["emptyState"];
};

export function SplitListError() {
  return (
    <PlainEmptyState
      style={{ minHeight: "186px" }}
      title="There's a problem loading this page"
      description="Reload the page or try again later."
      action={{
        url: ".",
        content: "Reload page",
      }}
    />
  );
}

export function SplitListErrorFallback({ header }: { header: ReactNode }) {
  return (
    <Card>
      <BlockStack gap="400">
        {header}
        <SplitListError />
      </BlockStack>
    </Card>
  );
}

export default function SplitList({
  divider,
  resourceName,
  items,
  emptyState,
  length,
  renderItem,
}: SplitListProps) {
  // TODO - The errors here don't come from loaderData, they come from the fetchers
  const { errors: loaderErrors } = useLoaderData<typeof loader>();

  const errors = useMemo(() => [...(loaderErrors || [])], [loaderErrors]);
  const isError = errors.length > 0;

  const midIndex = Math.ceil(length / 2);
  const firstHalf = items.slice(0, midIndex);
  const secondHalf = items.slice(midIndex);

  if (isError) return <SplitListError />;
  if (items.length === 0)
    return (
      <Box paddingBlock="1000">
        <InlineStack gap="400">{emptyState}</InlineStack>
      </Box>
    );

  return (
    <div className={styles.splitList}>
      <InlineStack gap="400">
        <Box width="45%">
          <ResourceList
            resourceName={resourceName}
            items={firstHalf}
            renderItem={renderItem}
            emptyState={emptyState}
          />
        </Box>

        {secondHalf.length > 0 && (
          <>
            {divider}
            <Box width="45%">
              <ResourceList
                resourceName={resourceName}
                items={secondHalf}
                renderItem={renderItem}
                emptyState={emptyState}
              />
            </Box>
          </>
        )}
      </InlineStack>
    </div>
  );
}

import {
  Box,
  InlineStack,
  SkeletonBodyText,
  SkeletonThumbnail,
} from "@shopify/polaris";

export function InlineBodyTextThumbnailSkeleton() {
  return (
    <InlineStack blockAlign="center" align="space-between">
      <SkeletonThumbnail size="small" />
      <Box width="75%">
        <SkeletonBodyText lines={1} />
      </Box>
    </InlineStack>
  );
}

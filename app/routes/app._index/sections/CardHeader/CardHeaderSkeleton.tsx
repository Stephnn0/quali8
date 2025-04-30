import {
  BlockStack,
  Box,
  InlineGrid,
  InlineStack,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
} from "@shopify/polaris";

export default function CardHeaderSkeleton() {
  return (
    <BlockStack gap="400">
      <InlineGrid
        gap="200"
        alignItems="center"
        columns={["oneThird", "oneHalf"]}
      >
        <InlineStack blockAlign="center" align="space-between">
          <SkeletonThumbnail size="small" />
          <Box width="75%">
            <SkeletonBodyText lines={1} />
          </Box>
        </InlineStack>

        <InlineStack align="end">
          <Box width="120px">
            <SkeletonDisplayText size="small" />
          </Box>
        </InlineStack>
      </InlineGrid>

      <Box width="50%">
        <SkeletonBodyText lines={1} />
      </Box>
    </BlockStack>
  );
}

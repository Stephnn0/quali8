import { BlockStack, Box, Card, InlineStack } from "@shopify/polaris";
import CardHeaderSkeleton from "../CardHeader/CardHeaderSkeleton";
import { InlineBodyTextThumbnailSkeleton } from "../../components/InlineBodyTextTumbnailSkeleton";

export default function ShippingDiscountSkeleton() {
  const columns = [1, 2, 3];
  return (
    <Card>
      <BlockStack gap="1000">
        <CardHeaderSkeleton />

        <InlineStack gap="600">
          <Box width="47%">
            <BlockStack gap="400">
              {columns.map((column) => (
                <InlineBodyTextThumbnailSkeleton key={column} />
              ))}
            </BlockStack>
          </Box>

          <Box width="47%">
            <BlockStack gap="400">
              {columns.map((column) => (
                <InlineBodyTextThumbnailSkeleton key={column} />
              ))}
            </BlockStack>
          </Box>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

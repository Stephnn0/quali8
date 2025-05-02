import { BlockStack, Image, Spinner, Text } from "@shopify/polaris";
import leaf_1 from "app/assets/qualifier-logo.png";

export default function SetupGraphic() {
  return (
    <BlockStack gap="1000" align="center" inlineAlign="center">
      <BlockStack gap="800">
        <Image source={leaf_1} alt="leaf" />
        <Text
          as="h2"
          variant="headingLg"
          fontWeight="semibold"
          alignment="center"
        >
          Setting up your app...
        </Text>
      </BlockStack>
      <Spinner size="large" />
    </BlockStack>
  );
}

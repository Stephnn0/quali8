import { BlockStack, Image, Spinner, Text } from "@shopify/polaris";
import bw from "app/assets/bw.png";

export default function SetupGraphic() {
  return (
    <BlockStack gap="1000" align="center" inlineAlign="center">
      <BlockStack gap="800">
        <Image source={bw} alt="leaf" />
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

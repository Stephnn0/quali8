import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineStack,
  SkeletonBodyText,
  Text,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
import type { AudienceForm } from "../hooks/useAudienceForm";

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(
    amount,
  );

/**
 * Live result of the current conditions: who matches, how many, and what
 * they're worth. Saving stores this list as the audience membership.
 */
export default function PreviewCard({ form }: { form: AudienceForm }) {
  const { previewCustomers, previewLoading, completeConditionCount } = form;

  const totalSpend = previewCustomers.reduce(
    (sum, customer) => sum + customer.amountSpent,
    0,
  );

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Matching customers
            </Text>
            {completeConditionCount > 0 && !previewLoading ? (
              <Badge tone="info">{String(previewCustomers.length)}</Badge>
            ) : null}
          </InlineStack>
          <Button
            icon={RefreshIcon}
            variant="tertiary"
            accessibilityLabel="Refresh preview"
            onClick={form.runPreview}
            disabled={completeConditionCount === 0}
            loading={previewLoading}
          />
        </InlineStack>

        {completeConditionCount === 0 ? (
          <Text as="p" tone="subdued">
            Add at least one complete condition and matching customers will
            appear here automatically.
          </Text>
        ) : previewLoading ? (
          <SkeletonBodyText lines={6} />
        ) : previewCustomers.length === 0 ? (
          <Text as="p" tone="subdued">
            No customers match these conditions yet. Loosen a condition or
            switch to “Match any”.
          </Text>
        ) : (
          <BlockStack gap="300">
            <InlineStack gap="400">
              <BlockStack gap="050">
                <Text as="p" tone="subdued" variant="bodySm">
                  Combined spend
                </Text>
                <Text as="p" variant="headingSm">
                  {money(totalSpend)}
                </Text>
              </BlockStack>
              <BlockStack gap="050">
                <Text as="p" tone="subdued" variant="bodySm">
                  Average
                </Text>
                <Text as="p" variant="headingSm">
                  {money(
                    previewCustomers.length
                      ? totalSpend / previewCustomers.length
                      : 0,
                  )}
                </Text>
              </BlockStack>
            </InlineStack>

            <Divider />

            <BlockStack gap="0">
              {previewCustomers.map((customer) => (
                <Box
                  key={customer.shopifyId}
                  paddingBlockStart="150"
                  paddingBlockEnd="150"
                >
                  <InlineStack
                    align="space-between"
                    blockAlign="center"
                    gap="200"
                    wrap={false}
                  >
                    <BlockStack gap="0">
                      <Text as="p" variant="bodySm" fontWeight="medium">
                        {`${customer.firstName} ${customer.lastName}`.trim() ||
                          "Unnamed customer"}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {[
                          customer.country || null,
                          `${customer.orderCount} ${
                            customer.orderCount === 1 ? "order" : "orders"
                          }`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </BlockStack>
                    <Text as="p" variant="bodySm" numeric>
                      {money(customer.amountSpent)}
                    </Text>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>

            <Text as="p" tone="subdued" variant="bodySm">
              Preview shows the first 50 matches. Saving stores this list as
              the audience members.
            </Text>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

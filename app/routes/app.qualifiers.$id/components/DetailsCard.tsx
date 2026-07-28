import { BlockStack, Card, Text, TextField } from "@shopify/polaris";
import type { AudienceForm } from "../hooks/useAudienceForm";

export default function DetailsCard({ form }: { form: AudienceForm }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Details
        </Text>
        <TextField
          label="Name"
          autoComplete="off"
          value={form.name}
          onChange={form.setName}
          error={form.nameError ?? undefined}
          placeholder="e.g. VIP customers"
        />
        <TextField
          label="Description"
          autoComplete="off"
          value={form.description}
          onChange={form.setDescription}
          placeholder="What makes this group special?"
          multiline={2}
        />
      </BlockStack>
    </Card>
  );
}

import { Card, InlineGrid, TextField } from "@shopify/polaris";
import type { QualifierForm } from "../hooks";

type NameDescriptionQualifierProps = {
  form: QualifierForm;
};

export default function NameDescriptionQualifier({
  form,
}: NameDescriptionQualifierProps) {
  const { fields } = form;

  const { name, description } = fields;

  return (
    <Card>
      <InlineGrid gap="400" columns={2}>
        <TextField
          {...name}
          autoComplete="off"
          label="Name"
          placeholder="Enter customer group name"
        />
        <TextField
          {...description}
          autoComplete="off"
          label="Description"
          placeholder="Enter customer group description"
        />
      </InlineGrid>
    </Card>
  );
}

// import { Card, InlineGrid, TextField } from "@shopify/polaris";
import { Card, InlineGrid, TextField } from "@shopify/polaris";
import type { CampaingForm } from "../hooks";

type NameDurationCampaingProps = {
  form: CampaingForm;
};

export default function NameDurationCampaing({
  form,
}: NameDurationCampaingProps) {
  const { fields } = form;

  const { name } = fields;

  return (
    <Card>
      <InlineGrid gap="400" columns={1}>
        <TextField
          {...name}
          autoComplete="off"
          label="Name"
          placeholder="Enter a campaing name"
        />
      </InlineGrid>
    </Card>
  );
}

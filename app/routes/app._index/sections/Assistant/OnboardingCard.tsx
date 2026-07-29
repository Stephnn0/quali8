import { useState } from "react";
import { useFetcher } from "react-router";
import {
  BlockStack,
  Button,
  Card,
  InlineGrid,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { NICHES, nicheLabel } from "app/services/assistant/taxonomy";
import styles from "./styles.module.css";

type Props = {
  suggestedNiche: string;
  suggestedCountry: string | null;
};

/** One-step profile confirmation: niche pre-inferred, country pre-filled. */
export default function OnboardingCard({
  suggestedNiche,
  suggestedCountry,
}: Props) {
  const fetcher = useFetcher();
  const saving = fetcher.state !== "idle";

  const [niche, setNiche] = useState(suggestedNiche);
  const [otherLabel, setOtherLabel] = useState("");
  const [country, setCountry] = useState(suggestedCountry ?? "");
  const [note, setNote] = useState("");

  const confirm = () => {
    fetcher.submit(
      {
        body: JSON.stringify({
          action: "confirm-profile",
          niche,
          nicheLabel: niche === "other" ? otherLabel || "Other" : nicheLabel(niche),
          country: country || undefined,
          note: note || undefined,
        }),
      },
      {
        method: "POST",
        encType: "multipart/form-data",
        action: "/api/assistant",
      },
    );
  };

  return (
    <BlockStack gap="400">
      <div className={styles.banner}>
        <p className={styles.bannerEyebrow}>Season Command Center</p>
        <h1 className={styles.bannerTitle}>
          Let&rsquo;s get your store ready for its next sales season
        </h1>
        <p className={styles.bannerText}>
          Quali8 builds your sales calendar around the occasions that matter
          for your business and tells you exactly how to prepare for each
          one. One quick confirmation and it starts working.
        </p>
      </div>

      <Card>
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              {suggestedNiche !== "other"
                ? `Looks like you run a ${nicheLabel(suggestedNiche).toLowerCase()} store — is that right?`
                : "Tell us about your store"}
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              We guessed from your catalog. Adjust anything before your
              assistant gets to work.
            </Text>
          </BlockStack>

          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <Select
              label="Your niche"
              options={NICHES.map((entry) => ({
                label: entry.label,
                value: entry.slug,
              }))}
              value={niche}
              onChange={setNiche}
            />
            <TextField
              label="Country"
              autoComplete="off"
              value={country}
              onChange={setCountry}
              placeholder="e.g. United States"
            />
          </InlineGrid>

          {niche === "other" ? (
            <TextField
              label="Describe your niche"
              autoComplete="off"
              value={otherLabel}
              onChange={setOtherLabel}
              placeholder="e.g. Handmade ceramics"
            />
          ) : null}

          <TextField
            label="Anything else we should know? (optional)"
            autoComplete="off"
            value={note}
            onChange={setNote}
            placeholder="e.g. We focus on weddings and events"
          />

          <div>
            <Button
              variant="primary"
              onClick={confirm}
              loading={saving}
              disabled={saving || (niche === "other" && !otherLabel.trim())}
            >
              Start my assistant
            </Button>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

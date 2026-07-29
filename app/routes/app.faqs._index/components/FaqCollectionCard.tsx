import { useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Divider,
  InlineStack,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, MagicIcon, PlusIcon } from "@shopify/polaris-icons";

type Faq = { id: number; question: string; answer: string };

type Group = {
  collectionId: string;
  collectionTitle: string;
  faqs: Faq[];
};

function FaqRow({ faq }: { faq: Faq }) {
  const fetcher = useFetcher();
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const busy = fetcher.state !== "idle";

  const save = () => {
    fetcher.submit(
      {
        body: JSON.stringify({ action: "update", id: faq.id, question, answer }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    setEditing(false);
  };

  const remove = () =>
    fetcher.submit(
      { body: JSON.stringify({ action: "delete", id: faq.id }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  if (editing) {
    return (
      <BlockStack gap="200">
        <TextField
          label="Question"
          autoComplete="off"
          value={question}
          onChange={setQuestion}
          maxLength={160}
          showCharacterCount
        />
        <TextField
          label="Answer"
          autoComplete="off"
          multiline={3}
          value={answer}
          onChange={setAnswer}
          maxLength={600}
          showCharacterCount
        />
        <InlineStack gap="200">
          <Button
            variant="primary"
            size="slim"
            onClick={save}
            loading={busy}
            disabled={!question.trim() || !answer.trim()}
          >
            Save
          </Button>
          <Button size="slim" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </InlineStack>
      </BlockStack>
    );
  }

  return (
    <InlineStack gap="300" wrap={false} blockAlign="start">
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text as="p" fontWeight="medium">
          {faq.question}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {faq.answer}
        </Text>
      </div>
      <Button
        icon={EditIcon}
        variant="tertiary"
        accessibilityLabel="Edit question"
        onClick={() => setEditing(true)}
      />
      <Button
        icon={DeleteIcon}
        variant="tertiary"
        accessibilityLabel="Delete question"
        onClick={remove}
        loading={busy}
      />
    </InlineStack>
  );
}

export default function FaqCollectionCard({ group }: { group: Group }) {
  const suggestFetcher = useFetcher();
  const addFetcher = useFetcher();
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const suggest = () =>
    suggestFetcher.submit(
      {
        body: JSON.stringify({
          action: "suggest",
          collectionId: group.collectionId,
          collectionTitle: group.collectionTitle,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );

  const add = () => {
    addFetcher.submit(
      {
        body: JSON.stringify({
          action: "add",
          collectionId: group.collectionId,
          collectionTitle: group.collectionTitle,
          question,
          answer,
        }),
      },
      { method: "POST", encType: "multipart/form-data" },
    );
    setQuestion("");
    setAnswer("");
    setAdding(false);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h2" variant="headingMd">
              {group.collectionTitle}
            </Text>
            <Badge>{`${group.faqs.length} ${group.faqs.length === 1 ? "question" : "questions"}`}</Badge>
          </InlineStack>
          <InlineStack gap="200">
            <Button
              icon={MagicIcon}
              onClick={suggest}
              loading={suggestFetcher.state !== "idle"}
              size="slim"
            >
              Suggest more
            </Button>
            <Button
              icon={PlusIcon}
              onClick={() => setAdding(true)}
              size="slim"
            >
              Add question
            </Button>
          </InlineStack>
        </InlineStack>

        <BlockStack gap="300">
          {group.faqs.map((faq, index) => (
            <BlockStack key={faq.id} gap="300">
              {index > 0 ? <Divider /> : null}
              <FaqRow faq={faq} />
            </BlockStack>
          ))}
        </BlockStack>

        {adding ? (
          <BlockStack gap="200">
            <Divider />
            <TextField
              label="Question"
              autoComplete="off"
              value={question}
              onChange={setQuestion}
              maxLength={160}
              placeholder="e.g. Do you deliver same day?"
            />
            <TextField
              label="Answer"
              autoComplete="off"
              multiline={3}
              value={answer}
              onChange={setAnswer}
              maxLength={600}
            />
            <InlineStack gap="200">
              <Button
                variant="primary"
                size="slim"
                onClick={add}
                loading={addFetcher.state !== "idle"}
                disabled={!question.trim() || !answer.trim()}
              >
                Add
              </Button>
              <Button size="slim" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </InlineStack>
          </BlockStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}

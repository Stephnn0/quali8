import { useState } from "react";
import { useFetcher } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";

type Todo = {
  id: number;
  title: string;
  description: string | null;
  kind: "SEO" | "MARKETING" | "GENERAL";
  source: "AI" | "MERCHANT";
  done: boolean;
};

const KIND_LABEL: Record<Todo["kind"], string> = {
  SEO: "SEO",
  MARKETING: "Marketing",
  GENERAL: "General",
};

function TodoRow({ todo }: { todo: Todo }) {
  const fetcher = useFetcher();

  const toggle = (done: boolean) =>
    fetcher.submit(
      { body: JSON.stringify({ action: "toggle-todo", id: todo.id, done }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  const remove = () =>
    fetcher.submit(
      { body: JSON.stringify({ action: "delete-todo", id: todo.id }) },
      { method: "POST", encType: "multipart/form-data" },
    );

  return (
    <InlineStack gap="300" wrap={false} blockAlign="start">
      <Checkbox
        label=""
        labelHidden
        checked={todo.done}
        onChange={toggle}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineStack gap="200" blockAlign="center">
          <Text
            as="p"
            fontWeight="medium"
            textDecorationLine={todo.done ? "line-through" : undefined}
          >
            {todo.title}
          </Text>
          {todo.source === "AI" ? <Badge size="small">Suggested</Badge> : null}
        </InlineStack>
        {todo.description ? (
          <Text as="p" variant="bodySm" tone="subdued">
            {todo.description}
          </Text>
        ) : null}
      </div>
      <Button
        icon={DeleteIcon}
        variant="tertiary"
        accessibilityLabel="Delete to-do"
        onClick={remove}
      />
    </InlineStack>
  );
}

/** Per-date to-do board grouped by kind, with inline add. */
export default function TodoBoard({ todos }: { todos: Todo[] }) {
  const addFetcher = useFetcher();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Todo["kind"]>("GENERAL");

  const add = () => {
    addFetcher.submit(
      { body: JSON.stringify({ action: "add-todo", title, kind }) },
      { method: "POST", encType: "multipart/form-data" },
    );
    setTitle("");
  };

  const groups: Todo["kind"][] = ["SEO", "MARKETING", "GENERAL"];
  const doneCount = todos.filter((todo) => todo.done).length;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Get ready for this date
          </Text>
          <Text as="span" tone="subdued" variant="bodySm">
            {doneCount} of {todos.length} done
          </Text>
        </InlineStack>

        {groups.map((group) => {
          const items = todos.filter((todo) => todo.kind === group);
          if (!items.length) return null;
          return (
            <BlockStack key={group} gap="300">
              <Text as="h3" variant="headingSm" tone="subdued">
                {KIND_LABEL[group]}
              </Text>
              {items.map((todo) => (
                <TodoRow key={todo.id} todo={todo} />
              ))}
            </BlockStack>
          );
        })}

        <InlineStack gap="200" blockAlign="end" wrap={false}>
          <div style={{ flex: 1 }}>
            <TextField
              label="Add your own to-do"
              labelHidden
              autoComplete="off"
              value={title}
              onChange={setTitle}
              placeholder="Add your own to-do"
            />
          </div>
          <Select
            label="Kind"
            labelHidden
            options={[
              { label: "General", value: "GENERAL" },
              { label: "SEO", value: "SEO" },
              { label: "Marketing", value: "MARKETING" },
            ]}
            value={kind}
            onChange={(value) => setKind(value as Todo["kind"])}
          />
          <Button
            icon={PlusIcon}
            onClick={add}
            disabled={!title.trim()}
            loading={addFetcher.state !== "idle"}
          >
            Add
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

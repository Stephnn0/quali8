import { useNavigate } from "react-router";
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineError,
  Link,
  TextField,
} from "@shopify/polaris";
import { GlobeIcon, PersonSegmentIcon } from "@shopify/polaris-icons";
import type { DiscountForm } from "../hooks";
import { ChoiceTiles } from "./ChoiceTiles";
import { SectionHead } from "./SectionHead";
import styles from "../../app.actions.discounts/smartShipping.module.css";

export function AudienceSection({ form }: { form: DiscountForm }) {
  const navigate = useNavigate();
  const {
    appliesToAllCustomers,
    qualifierIds,
    isMinimumCartValueEnabled,
    minimumCartValue,
  } = form.fields;

  const toggleAudience = (id: string, checked: boolean) => {
    const next = checked
      ? [...qualifierIds.value, id]
      : qualifierIds.value.filter((entry) => entry !== id);
    qualifierIds.onChange(next);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <SectionHead
          number="3"
          title="Who qualifies"
          text="Everyone, or only customers in the audiences you pick."
        />
        <ChoiceTiles
          name="Who qualifies"
          value={appliesToAllCustomers.value ? "everyone" : "audiences"}
          onChange={(next) => appliesToAllCustomers.onChange(next === "everyone")}
          options={[
            {
              value: "everyone",
              label: "Everyone",
              description: "Any customer who reaches checkout.",
              icon: GlobeIcon,
            },
            {
              value: "audiences",
              label: "Specific audiences",
              description: "Customers matched by Customer Insights.",
              icon: PersonSegmentIcon,
            },
          ]}
        />

        {!appliesToAllCustomers.value ? (
          <BlockStack gap="200">
            {form.audiences.length > 0 ? (
              <div className={styles.checklist}>
                {form.audiences.map((audience) => {
                  const id = String(audience.id);
                  const checked = qualifierIds.value.includes(id);
                  return (
                    <div
                      key={id}
                      className={`${styles.checkRow} ${
                        checked ? styles.checkRowSelected : ""
                      }`}
                    >
                      <Checkbox
                        label={audience.name}
                        helpText={`${audience.customers.length} customer${
                          audience.customers.length === 1 ? "" : "s"
                        } match today`}
                        checked={checked}
                        onChange={(value) => toggleAudience(id, value)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.checkEmpty}>
                <span>
                  No audiences yet. Build one in Customer Insights, then come
                  back to pick it here.
                </span>
                <Button onClick={() => navigate("/app/qualifiers/new")}>
                  Create audience
                </Button>
              </div>
            )}
            {form.errors.qualifierIds ? (
              <InlineError
                message={form.errors.qualifierIds}
                fieldID="audiences"
              />
            ) : null}
            {form.audiences.length > 0 ? (
              <Link url="/app/qualifiers">Manage audiences</Link>
            ) : null}
          </BlockStack>
        ) : null}

        <BlockStack gap="200">
          <Checkbox
            label="Require a minimum cart value"
            helpText="The discount only applies once the cart reaches this amount."
            checked={isMinimumCartValueEnabled.value}
            onChange={isMinimumCartValueEnabled.onChange}
          />
          {isMinimumCartValueEnabled.value ? (
            <TextField
              label="Minimum cart value"
              labelHidden
              type="number"
              inputMode="decimal"
              min={0}
              prefix="$"
              value={minimumCartValue.value ? String(minimumCartValue.value) : ""}
              onChange={(next) => minimumCartValue.onChange(Number(next) || 0)}
              error={form.errors.minimumCartValue ?? undefined}
              autoComplete="off"
              placeholder="50"
            />
          ) : null}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

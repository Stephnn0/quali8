# Audiences Polish & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the free Audiences feature into a polished, analytics-rich hub: per-audience revenue/order metrics, human-readable conditions, membership refresh with "last synced" freshness, an insights panel in the editor, and CSV export.

**Architecture:** Audience membership is a snapshot taken when the merchant saves (Shopify customer search → `Customers` rows, M2M to `Qualifiers`). `Customers` already stores `amountSpent`, `orderCount`, `country`, so all analytics are computed from our own Postgres — no extra Shopify calls on page load. Pure computation lives in `app/services/audiences/*` (unit-tested); loaders shape it; Polaris renders it. A new refresh action re-runs the stored conditions against Shopify to combat snapshot staleness, stamping a new `Qualifiers.lastSyncedAt` column.

**Tech Stack:** React Router 7 (framework mode), Polaris 12, Prisma 6 + PostgreSQL, Vitest (config: `vitest.config.ts`, includes `app/**/*.test.ts`). No chart libraries — stat cards and Polaris `ProgressBar` only.

**Conventions that apply to every task** (from CLAUDE.md):
- Imports use the `app/...` alias, never `~`.
- `*.server.ts` files are server-only — never import them into components.
- Route folders decompose as `route.tsx` + `loader/` + `action/` + `components/`.
- Loaders/actions start with `await authenticate.admin(request)` and wrap results in `handleApiSuccess` / `handleApiError`.
- Audiences are the **free** feature (`hasQualifiers` is true on both plans) — do NOT add plan gatekeeping to these routes.
- Run `npx eslint <changed files>` before each commit (repo-wide `npm run lint` crashes on a pre-existing eslint-plugin-jest issue — lint the files you touched instead).

---

## File structure

```
app/services/audiences/
  audienceStats.ts           # pure: per-audience + cross-audience metrics
  audienceStats.test.ts
  describeCondition.ts       # pure: Condition row -> "Order count > 3"
  describeCondition.test.ts
  membersCsv.ts              # pure: members -> CSV string
  membersCsv.test.ts
  refreshAudienceMembers.server.ts  # re-run conditions against Shopify
app/routes/app.qualifiers._index/
  loader/index.ts            # + stats per audience, summary, lastSyncedAt
  route.tsx                  # rewritten: stat cards + richer IndexTable
app/routes/app.qualifiers.$id/
  components/AudienceInsights.tsx   # analytics card in the editor
  route.tsx                  # renders AudienceInsights + CSV export button
app/routes/api.qualifiers/action/index.ts  # + PATCH refresh branch
prisma/migrations/20260730000000_add_audience_last_synced/migration.sql
prisma/schema.prisma         # Qualifiers.lastSyncedAt
```

---

### Task 1: Audience stats engine (pure + tested)

**Files:**
- Create: `app/services/audiences/audienceStats.ts`
- Test: `app/services/audiences/audienceStats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/services/audiences/audienceStats.test.ts
import { describe, expect, it } from "vitest";
import {
  computeAudienceStats,
  summarizeAudiences,
  type AudienceMember,
} from "./audienceStats";

const member = (
  amountSpent: string | null,
  orderCount: number | null,
  country: string | null,
  shopifyId = Math.random().toString(),
): AudienceMember & { shopifyId: string } => ({
  shopifyId,
  amountSpent,
  orderCount,
  country,
});

describe("computeAudienceStats", () => {
  it("aggregates revenue, orders, and countries", () => {
    const stats = computeAudienceStats([
      member("100.50", 3, "United States"),
      member("49.50", 1, "United States"),
      member("0", 0, "Canada"),
    ]);

    expect(stats).toEqual({
      memberCount: 3,
      totalRevenue: 150,
      averageSpend: 50,
      averageOrders: 1.3,
      topCountries: [
        { country: "United States", count: 2, share: 0.67 },
        { country: "Canada", count: 1, share: 0.33 },
      ],
    });
  });

  it("survives malformed and missing data", () => {
    const stats = computeAudienceStats([
      member("not-a-number", null, null),
      member(null, 2, ""),
    ]);

    expect(stats.memberCount).toBe(2);
    expect(stats.totalRevenue).toBe(0);
    expect(stats.averageOrders).toBe(1);
    expect(stats.topCountries).toEqual([]);
  });

  it("returns zeros for an empty audience", () => {
    expect(computeAudienceStats([])).toEqual({
      memberCount: 0,
      totalRevenue: 0,
      averageSpend: 0,
      averageOrders: 0,
      topCountries: [],
    });
  });

  it("caps topCountries at five entries", () => {
    const stats = computeAudienceStats(
      ["A", "B", "C", "D", "E", "F"].map((c) => member("1", 1, c)),
    );
    expect(stats.topCountries).toHaveLength(5);
  });
});

describe("summarizeAudiences", () => {
  it("deduplicates customers across audiences", () => {
    const shared = member("10", 1, "US", "gid://shopify/Customer/1");
    const summary = summarizeAudiences([
      { customers: [shared, member("20", 2, "US", "gid://shopify/Customer/2")] },
      { customers: [shared] },
    ]);

    expect(summary).toEqual({
      audienceCount: 2,
      reachedCustomers: 2,
      totalRevenue: 30,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/services/audiences/audienceStats.test.ts`
Expected: FAIL — cannot resolve `./audienceStats`.

- [ ] **Step 3: Write the implementation**

```ts
// app/services/audiences/audienceStats.ts
/**
 * Pure aggregation over audience members (`Customers` rows). Membership is a
 * snapshot taken when the audience was last saved/refreshed, so everything
 * here computes from our own DB — no Shopify calls. Client-safe: no server
 * imports (used by both loaders and components).
 */

export type AudienceMember = {
  amountSpent: string | null;
  orderCount: number | null;
  country: string | null;
};

export type AudienceStats = {
  memberCount: number;
  /** Lifetime revenue represented by the members, major currency units. */
  totalRevenue: number;
  averageSpend: number;
  averageOrders: number;
  /** Up to 5, sorted by count desc. `share` is 0–1, rounded to 2 decimals. */
  topCountries: Array<{ country: string; count: number; share: number }>;
};

function parseSpent(amountSpent: string | null): number {
  const parsed = Number.parseFloat(amountSpent ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeAudienceStats(members: AudienceMember[]): AudienceStats {
  const memberCount = members.length;
  if (memberCount === 0) {
    return {
      memberCount: 0,
      totalRevenue: 0,
      averageSpend: 0,
      averageOrders: 0,
      topCountries: [],
    };
  }

  let totalRevenue = 0;
  let totalOrders = 0;
  const countryCounts = new Map<string, number>();

  for (const m of members) {
    totalRevenue += parseSpent(m.amountSpent);
    totalOrders += m.orderCount ?? 0;
    if (m.country) {
      countryCounts.set(m.country, (countryCounts.get(m.country) ?? 0) + 1);
    }
  }

  const topCountries = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({
      country,
      count,
      share: round2(count / memberCount),
    }));

  return {
    memberCount,
    totalRevenue: round2(totalRevenue),
    averageSpend: round2(totalRevenue / memberCount),
    averageOrders: round1(totalOrders / memberCount),
    topCountries,
  };
}

export type AudienceSummary = {
  audienceCount: number;
  /** Distinct customers across all audiences. */
  reachedCustomers: number;
  /** Revenue of those distinct customers (each counted once). */
  totalRevenue: number;
};

export function summarizeAudiences(
  audiences: Array<{ customers: Array<AudienceMember & { shopifyId: string }> }>,
): AudienceSummary {
  const seen = new Map<string, number>();
  for (const audience of audiences) {
    for (const m of audience.customers) {
      if (!seen.has(m.shopifyId)) seen.set(m.shopifyId, parseSpent(m.amountSpent));
    }
  }
  let totalRevenue = 0;
  for (const spent of seen.values()) totalRevenue += spent;

  return {
    audienceCount: audiences.length,
    reachedCustomers: seen.size,
    totalRevenue: round2(totalRevenue),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/services/audiences/audienceStats.test.ts`
Expected: PASS (5 tests). Note the first test expects `averageOrders: 1.3` (4/3 rounded to one decimal) and shares 0.67/0.33 — if these fail, fix the rounding helpers, not the test.

- [ ] **Step 5: Commit**

```bash
npx eslint app/services/audiences/audienceStats.ts app/services/audiences/audienceStats.test.ts
git add app/services/audiences/audienceStats.ts app/services/audiences/audienceStats.test.ts
git commit -m "feat: pure audience stats engine (revenue, orders, countries)"
```

---

### Task 2: Human-readable condition descriptions (pure + tested)

**Files:**
- Create: `app/services/audiences/describeCondition.ts`
- Test: `app/services/audiences/describeCondition.test.ts`

The DB enums (prisma/schema.prisma): `ConditionType` = `customer_tag | customer_order_count | customer_email | customer_country | customer_amount_spent | updated_at | tag_not | order_date | last_name | last_abandoned_order_date | first_name | customer_date`; `ComparisonType` = `equals | not_equals | greater_than | less_than | greater_than_equals | less_than_equals`.

- [ ] **Step 1: Write the failing test**

```ts
// app/services/audiences/describeCondition.test.ts
import { describe, expect, it } from "vitest";
import { describeCondition } from "./describeCondition";

describe("describeCondition", () => {
  it("describes tags", () => {
    expect(
      describeCondition({ type: "customer_tag", comparisonType: "equals", value: "VIP" }),
    ).toBe('Tagged "VIP"');
    expect(
      describeCondition({ type: "tag_not", comparisonType: "equals", value: "spam" }),
    ).toBe('Not tagged "spam"');
  });

  it("describes numeric comparisons", () => {
    expect(
      describeCondition({
        type: "customer_order_count",
        comparisonType: "greater_than",
        value: "3",
      }),
    ).toBe("Order count > 3");
    expect(
      describeCondition({
        type: "customer_amount_spent",
        comparisonType: "greater_than_equals",
        value: "50",
      }),
    ).toBe("Total spent ≥ 50");
  });

  it("describes identity fields", () => {
    expect(
      describeCondition({ type: "customer_country", comparisonType: "equals", value: "US" }),
    ).toBe("Country is US");
    expect(
      describeCondition({ type: "customer_email", comparisonType: "not_equals", value: "a@b.c" }),
    ).toBe("Email is not a@b.c");
  });

  it("falls back gracefully for unknown types", () => {
    expect(
      describeCondition({ type: "mystery", comparisonType: "equals", value: "x" }),
    ).toBe("mystery is x");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/services/audiences/describeCondition.test.ts`
Expected: FAIL — cannot resolve `./describeCondition`.

- [ ] **Step 3: Write the implementation**

```ts
// app/services/audiences/describeCondition.ts
/**
 * Turns a stored `Conditions` row into merchant-readable copy, e.g.
 * "Order count > 3", 'Tagged "VIP"'. Client-safe (no server imports).
 */

type ConditionLike = {
  type: string;
  comparisonType: string;
  value: string;
};

const FIELD_LABELS: Record<string, string> = {
  customer_tag: "Tag",
  tag_not: "Tag",
  customer_order_count: "Order count",
  customer_email: "Email",
  customer_country: "Country",
  customer_amount_spent: "Total spent",
  updated_at: "Updated",
  order_date: "Order date",
  last_abandoned_order_date: "Last abandoned checkout",
  customer_date: "Customer since",
  first_name: "First name",
  last_name: "Last name",
};

const COMPARISON_LABELS: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  greater_than: ">",
  less_than: "<",
  greater_than_equals: "≥",
  less_than_equals: "≤",
};

export function describeCondition(condition: ConditionLike): string {
  const { type, comparisonType, value } = condition;

  if (type === "customer_tag") return `Tagged "${value}"`;
  if (type === "tag_not") return `Not tagged "${value}"`;

  const field = FIELD_LABELS[type] ?? type;
  const comparison = COMPARISON_LABELS[comparisonType] ?? comparisonType;
  return `${field} ${comparison} ${value}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/services/audiences/describeCondition.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
npx eslint app/services/audiences/describeCondition.ts app/services/audiences/describeCondition.test.ts
git add app/services/audiences/describeCondition.ts app/services/audiences/describeCondition.test.ts
git commit -m "feat: human-readable audience condition descriptions"
```

---

### Task 3: `Qualifiers.lastSyncedAt` column

**Files:**
- Modify: `prisma/schema.prisma` (the `Qualifiers` model, ~line 91)
- Create: `prisma/migrations/20260730000000_add_audience_last_synced/migration.sql`

- [ ] **Step 1: Add the column to the schema**

In `prisma/schema.prisma`, inside `model Qualifiers`, after `conditionLogicType LogicType`:

```prisma
  /// When membership was last synced from Shopify (save or manual refresh).
  /// Null for audiences created before this column existed.
  lastSyncedAt       DateTime?
```

- [ ] **Step 2: Write the migration by hand** (repo convention — migrations are hand-written; note existing migrations are future-dated `202607xx`, so this folder name must sort after `20260729000001`)

```sql
-- prisma/migrations/20260730000000_add_audience_last_synced/migration.sql
-- When audience membership was last synced from Shopify (initial save or
-- manual refresh). Null for audiences created before this column existed.

-- AlterTable
ALTER TABLE "Qualifiers" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
```

- [ ] **Step 3: Apply and regenerate**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: "All migrations have been successfully applied." and a regenerated client.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260730000000_add_audience_last_synced
git commit -m "feat: Qualifiers.lastSyncedAt for audience freshness"
```

---

### Task 4: Index loader returns analytics

**Files:**
- Modify: `app/routes/app.qualifiers._index/loader/index.ts` (full replace below)

The loader already fetches qualifiers with `customers` and `conditions` included (`getQualifiersByShopWithCustomersAndConditions`). Extend it to attach computed stats and a cross-audience summary.

- [ ] **Step 1: Replace the loader**

```ts
// app/routes/app.qualifiers._index/loader/index.ts
import type { LoaderFunctionArgs } from "react-router";
import { getQualifiersByShopWithCustomersAndConditions } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  computeAudienceStats,
  summarizeAudiences,
  type AudienceStats,
  type AudienceSummary,
} from "app/services/audiences/audienceStats";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const itemsPerPage = 15;
  const skip = (page - 1) * itemsPerPage;

  try {
    const qualifiers = await getQualifiersByShopWithCustomersAndConditions(
      {
        where: { shop: session.shop },
        orderBy: { updatedAt: "desc" },
        take: itemsPerPage,
        skip,
      },
      db,
    );

    const audiences = (qualifiers?.qualifiers ?? []).map((qualifier) => ({
      id: qualifier.id,
      name: qualifier.name,
      description: qualifier.description,
      conditionLogicType: qualifier.conditionLogicType,
      lastSyncedAt: qualifier.lastSyncedAt,
      conditions: qualifier.conditions.map((condition) => ({
        id: condition.id,
        type: condition.type,
        comparisonType: condition.comparisonType,
        value: condition.value,
      })),
      stats: computeAudienceStats(qualifier.customers),
    }));

    const summary = summarizeAudiences(qualifiers?.qualifiers ?? []);

    return handleApiSuccess<AudiencesIndexData>({
      payload: {
        audiences,
        summary,
        itemsPerPage,
        page,
        total: qualifiers?.qualifiersCount ?? 0,
      },
      code: "success",
    });
  } catch (error) {
    console.error(error);
    return handleApiError({ errors: error, code: "error" });
  }
}

export type AudienceRow = {
  id: number;
  name: string;
  description: string;
  conditionLogicType: string;
  lastSyncedAt: Date | null;
  conditions: Array<{
    id: number;
    type: string;
    comparisonType: string;
    value: string;
  }>;
  stats: AudienceStats;
};

export type AudiencesIndexData = {
  audiences: AudienceRow[];
  summary: AudienceSummary;
  itemsPerPage: number;
  page: number;
  total: number;
};
```

Note: `summarizeAudiences` receives the raw qualifier rows — its parameter type only requires `customers: {shopifyId, amountSpent, orderCount, country}[]`, which the included `customers` relation satisfies structurally.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v polaris-types`
Expected: no new errors. (The `polaris-types` type-library warning is pre-existing noise. The route component still references the old payload shape — that's Task 5; if `tsc` flags `app/routes/app.qualifiers._index/route.tsx`, proceed to Task 5 before committing, then commit both together with Task 5's message.)

- [ ] **Step 3: Hold the commit until Task 5** (loader + UI ship together so the route never references a missing field).

---

### Task 5: Index page overhaul (stat cards + richer table)

**Files:**
- Modify: `app/routes/app.qualifiers._index/route.tsx` (full replace below)

- [ ] **Step 1: Replace the route component**

```tsx
// app/routes/app.qualifiers._index/route.tsx
import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  IndexTable,
  InlineGrid,
  InlineStack,
  Layout,
  Modal,
  Page,
  Pagination,
  Text,
  Tooltip,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import emptyImage from "app/assets/customer-segment-icon.png";
import { describeCondition } from "app/services/audiences/describeCondition";
import { loader, type AudienceRow } from "./loader";

export { loader };

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(amount);

function LastSynced({ lastSyncedAt }: { lastSyncedAt: AudienceRow["lastSyncedAt"] }) {
  if (!lastSyncedAt) {
    return <Badge tone="attention">Never</Badge>;
  }
  const date = new Date(lastSyncedAt);
  return (
    <Text as="span" tone="subdued" variant="bodySm">
      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </Text>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="p" variant="headingLg">
          {value}
        </Text>
        {detail ? (
          <Text as="p" tone="subdued" variant="bodySm">
            {detail}
          </Text>
        ) : null}
      </BlockStack>
    </Card>
  );
}

export default function Audiences() {
  const loaderData = useLoaderData<typeof loader>();
  const audiences = loaderData?.payload?.audiences ?? [];
  const summary = loaderData?.payload?.summary;

  const [selectedAudience, setSelectedAudience] = useState<{
    id: number;
    conditionIds: number[];
  } | null>(null);
  const [modalActive, setModalActive] = useState(false);
  const handleModalChange = useCallback(() => setModalActive((prev) => !prev), []);

  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const handleDeleteClick = (id: number, conditionIds: number[]) => {
    setSelectedAudience({ id, conditionIds });
    setModalActive(true);
  };

  const handleDeleteConfirm = () => {
    setModalActive(false);
    if (!selectedAudience) return;
    fetcher.submit(
      {
        body: JSON.stringify({
          qualifierId: selectedAudience.id,
          conditionIds: selectedAudience.conditionIds,
        }),
      },
      { method: "DELETE", encType: "multipart/form-data", action: "/api/qualifiers" },
    );
    shopify.toast.show("Audience deleted");
  };

  // Pagination
  const [, setSearchParams] = useSearchParams();
  const currentPage = loaderData?.payload?.page || 1;
  const totalItems = loaderData?.payload?.total ?? 0;
  const itemsPerPage = loaderData?.payload?.itemsPerPage ?? 15;
  const hasNext = currentPage * itemsPerPage < totalItems;
  const hasPrevious = currentPage > 1;

  const rowMarkup = audiences.map((audience, index) => (
    <IndexTable.Row id={String(audience.id)} key={audience.id} position={index}>
      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {audience.name}
          </Text>
          <Text variant="bodySm" tone="subdued" as="span">
            {audience.description}
          </Text>
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Tooltip
          content={audience.conditions.map(describeCondition).join(
            audience.conditionLogicType === "AND" ? " and " : " or ",
          )}
        >
          <Badge>
            {`${audience.conditions.length} ${
              audience.conditions.length === 1 ? "condition" : "conditions"
            }`}
          </Badge>
        </Tooltip>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {audience.stats.memberCount}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {money(audience.stats.totalRevenue)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {audience.stats.averageOrders}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <LastSynced lastSyncedAt={audience.lastSyncedAt} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Link to={`/app/qualifiers/${audience.id}`}>
            <Button icon={EditIcon} accessibilityLabel="Edit audience" />
          </Link>
          <Button
            icon={DeleteIcon}
            accessibilityLabel="Delete audience"
            onClick={() =>
              handleDeleteClick(
                audience.id,
                audience.conditions.map((condition) => condition.id),
              )
            }
          />
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Audiences"
      subtitle="Group customers by behavior and target them with promotions"
      primaryAction={
        <Link to="new">
          <Button variant="primary">Create audience</Button>
        </Link>
      }
    >
      <Layout>
        {summary && audiences.length > 0 ? (
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
              <StatCard label="Audiences" value={String(summary.audienceCount)} />
              <StatCard
                label="Customers reached"
                value={String(summary.reachedCustomers)}
                detail="Distinct customers across all audiences"
              />
              <StatCard
                label="Revenue represented"
                value={money(summary.totalRevenue)}
                detail="Lifetime spend of reached customers"
              />
            </InlineGrid>
          </Layout.Section>
        ) : null}

        <Layout.Section>
          {audiences.length > 0 ? (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "audience", plural: "audiences" }}
                itemCount={audiences.length}
                selectable={false}
                headings={[
                  { title: "Audience" },
                  { title: "Conditions" },
                  { title: "Members" },
                  { title: "Revenue" },
                  { title: "Avg orders" },
                  { title: "Last synced" },
                  { title: "Actions" },
                ]}
              >
                {rowMarkup}
              </IndexTable>
              {(hasNext || hasPrevious) && (
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={hasPrevious}
                    onPrevious={() => setSearchParams({ page: String(currentPage - 1) })}
                    hasNext={hasNext}
                    onNext={() => setSearchParams({ page: String(currentPage + 1) })}
                  />
                </InlineStack>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="Create your first audience"
                action={{ content: "Create audience", url: "/app/qualifiers/new" }}
                image={emptyImage}
              >
                <p>
                  Group customers by tags, order count, spending, or country —
                  then target them with shipping promotions.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={modalActive}
        onClose={handleModalChange}
        title="Delete this audience?"
        primaryAction={{ content: "Delete", destructive: true, onAction: handleDeleteConfirm }}
        secondaryActions={[{ content: "Cancel", onAction: handleModalChange }]}
      >
        <Modal.Section>
          <Text as="p">
            The audience and its conditions will be removed. Promotions that
            target it will stop matching these customers.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
```

Notes for the implementer:
- This intentionally drops `useIndexResourceState` (bulk selection was rendered but unused) and the commented-out `MediaCard` video block. The old page title "Customer Target Groups" becomes "Audiences" to match the nav label.
- If Polaris complains that `Text` lacks a `numeric` prop in v12, replace `numeric` with `alignment="end"`.
- Keep the existing `hooks`/`action` files untouched.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v polaris-types` — expected: clean.
Run: `npx eslint app/routes/app.qualifiers._index/route.tsx app/routes/app.qualifiers._index/loader/index.ts` — expected: clean.
Run: `npm run build` — expected: `✓ built`.
Then `npm run dev` and open the Audiences page: stat cards render, table shows Members/Revenue/Avg orders, condition badge tooltip shows readable conditions, delete still works.

- [ ] **Step 3: Commit (includes Task 4's loader)**

```bash
git add app/routes/app.qualifiers._index
git commit -m "feat: audiences index with analytics summary and richer table"
```

---

### Task 6: Refresh membership from Shopify

**Files:**
- Create: `app/services/audiences/refreshAudienceMembers.server.ts`
- Modify: `app/routes/api.qualifiers/action/index.ts` (add PATCH branch)
- Modify: `app/routes/app.qualifiers._index/route.tsx` (add Refresh action per row)

- [ ] **Step 1: Write the refresh service**

```ts
// app/services/audiences/refreshAudienceMembers.server.ts
import type { PrismaClient } from "@prisma/client";
import { upsertCustomer } from "app/models/app.server/customers/customer.server";
import { getCustomers } from "app/models/shopify.server/customers";
import { buildCustomerQuery } from "app/utils/queryEngine";
import type { AuthAdminContext } from "app/types/utility/shopify";

/**
 * Re-runs an audience's stored conditions against Shopify's customer search
 * and replaces the member snapshot, stamping `lastSyncedAt`. Mirrors what the
 * editor does on save (api.shopifyCustomers + api.qualifiers), but server-side
 * in one step. Returns the new member count, or null if the audience doesn't
 * exist for this shop.
 *
 * NOTE: `getCustomers` fetches the first 50 matches (existing app behavior —
 * same limit the editor uses when building an audience).
 */
export async function refreshAudienceMembers(
  authAdminContext: AuthAdminContext,
  qualifierId: number,
  db: PrismaClient,
): Promise<number | null> {
  const { session, admin } = authAdminContext;

  const qualifier = await db.qualifiers.findFirst({
    where: { id: qualifierId, shop: session.shop },
    include: { conditions: true },
  });
  if (!qualifier) return null;

  const query = buildCustomerQuery(
    qualifier.conditions,
    qualifier.conditionLogicType,
  );
  const edges = (await getCustomers(admin.graphql, query)) ?? [];

  type CustomerEdge = {
    node: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      amountSpent?: { amount?: string | null } | null;
      addresses?: Array<{ country?: string | null }> | null;
      orders?: { edges?: Array<unknown> | null } | null;
    };
  };

  const members = (edges as CustomerEdge[]).map(({ node }) => ({
    shopifyId: node.id,
    firstName: node.firstName ?? undefined,
    lastName: node.lastName ?? undefined,
    amountSpent: Number(node.amountSpent?.amount ?? 0),
    orderCount: node.orders?.edges?.length ?? 0,
    country: node.addresses?.[0]?.country ?? undefined,
    shop: session.shop,
    qualifierId: qualifier.id,
  }));

  // Replace the snapshot: clear the M2M links, then reconnect the fresh set.
  await db.qualifiers.update({
    where: { id: qualifier.id },
    data: { customers: { set: [] }, lastSyncedAt: new Date() },
  });
  for (const member of members) {
    await upsertCustomer(db, member);
  }

  return members.length;
}
```

- [ ] **Step 2: Add the PATCH branch to the API action**

In `app/routes/api.qualifiers/action/index.ts`, add the import:

```ts
import { refreshAudienceMembers } from "app/services/audiences/refreshAudienceMembers.server";
```

Inside `action`, the handler currently destructures the parsed body and branches on `request.method === "POST"` / `"PUT"` / `"DELETE"`. The refresh call needs the full admin context, so also change the authenticate line at the top of the function from
`const { session } = await authenticate.admin(request);` to
`const authAdminContext = await authenticate.admin(request);` followed by
`const { session } = authAdminContext;` (the rest of the handler keeps using `session`). Then add, before the POST branch:

```ts
    if (request.method === "PATCH") {
      const { qualifierId } = parsedBody as { qualifierId: number };
      const memberCount = await refreshAudienceMembers(
        authAdminContext,
        Number(qualifierId),
        db,
      );
      if (memberCount === null) {
        return handleApiError({ errors: "Audience not found", code: "error" });
      }
      return { payload: { memberCount }, code: "refreshed" };
    }
```

(This route's existing branches return plain objects / `handleApiError` — match that style.)

- [ ] **Step 3: Add the Refresh row action in the index UI**

In `app/routes/app.qualifiers._index/route.tsx` (from Task 5):

Add `RefreshIcon` to the `@shopify/polaris-icons` import, and add a dedicated fetcher near the existing one:

```tsx
  const refreshFetcher = useFetcher();
  const refreshingId =
    refreshFetcher.state !== "idle"
      ? JSON.parse(String(refreshFetcher.formData?.get("body") ?? "{}")).qualifierId
      : null;

  const handleRefresh = (id: number) => {
    refreshFetcher.submit(
      { body: JSON.stringify({ qualifierId: id }) },
      { method: "PATCH", encType: "multipart/form-data", action: "/api/qualifiers" },
    );
    shopify.toast.show("Refreshing audience…");
  };
```

And in the row's `ButtonGroup`, before the Edit button:

```tsx
          <Button
            icon={RefreshIcon}
            accessibilityLabel="Refresh members from Shopify"
            loading={refreshingId === audience.id}
            onClick={() => handleRefresh(audience.id)}
          />
```

(When the fetcher completes, React Router revalidates the loader automatically, so the Members/Revenue/Last synced columns update on their own.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v polaris-types` and `npx eslint` on the three touched files — expected: clean.
Run: `npm run dev`, open Audiences, hit Refresh on an audience: button spins, toast shows, then Members/Last synced update.

- [ ] **Step 5: Commit**

```bash
git add app/services/audiences/refreshAudienceMembers.server.ts app/routes/api.qualifiers/action/index.ts app/routes/app.qualifiers._index/route.tsx
git commit -m "feat: refresh audience membership from Shopify with lastSyncedAt"
```

---

### Task 7: Insights panel in the audience editor

**Files:**
- Create: `app/routes/app.qualifiers.$id/components/AudienceInsights.tsx`
- Modify: `app/routes/app.qualifiers.$id/route.tsx` (render the panel)

The editor's loader (`app/routes/app.qualifiers.$id/loader/index.ts`) already returns the qualifier with `customers` and `conditions` included — no loader change needed.

- [ ] **Step 1: Write the component**

```tsx
// app/routes/app.qualifiers.$id/components/AudienceInsights.tsx
import {
  Badge,
  BlockStack,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import {
  computeAudienceStats,
  type AudienceMember,
} from "app/services/audiences/audienceStats";
import { describeCondition } from "app/services/audiences/describeCondition";

const money = (amount: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(amount);

type Props = {
  customers: AudienceMember[];
  conditions: Array<{ type: string; comparisonType: string; value: string }>;
  conditionLogicType: string;
  lastSyncedAt?: string | Date | null;
};

/** Read-only analytics card shown when editing an existing audience. */
export function AudienceInsights({
  customers,
  conditions,
  conditionLogicType,
  lastSyncedAt,
}: Props) {
  const stats = computeAudienceStats(customers);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Audience insights
          </Text>
          {lastSyncedAt ? (
            <Text as="span" tone="subdued" variant="bodySm">
              Last synced {new Date(lastSyncedAt).toLocaleDateString()}
            </Text>
          ) : (
            <Badge tone="attention">Never synced</Badge>
          )}
        </InlineStack>

        <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
          {[
            { label: "Members", value: String(stats.memberCount) },
            { label: "Lifetime revenue", value: money(stats.totalRevenue) },
            { label: "Avg spend", value: money(stats.averageSpend) },
            { label: "Avg orders", value: String(stats.averageOrders) },
          ].map(({ label, value }) => (
            <BlockStack gap="050" key={label}>
              <Text as="p" tone="subdued" variant="bodySm">
                {label}
              </Text>
              <Text as="p" variant="headingLg">
                {value}
              </Text>
            </BlockStack>
          ))}
        </InlineGrid>

        {stats.topCountries.length > 0 ? (
          <>
            <Divider />
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Top countries
              </Text>
              {stats.topCountries.map(({ country, count, share }) => (
                <BlockStack gap="050" key={country}>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">
                      {country}
                    </Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {count} · {Math.round(share * 100)}%
                    </Text>
                  </InlineStack>
                  <ProgressBar progress={share * 100} size="small" tone="success" />
                </BlockStack>
              ))}
            </BlockStack>
          </>
        ) : null}

        {conditions.length > 0 ? (
          <>
            <Divider />
            <InlineStack gap="150" wrap>
              {conditions.map((condition, index) => (
                <InlineStack gap="150" blockAlign="center" key={index}>
                  {index > 0 ? (
                    <Text as="span" tone="subdued" variant="bodySm">
                      {conditionLogicType === "AND" ? "and" : "or"}
                    </Text>
                  ) : null}
                  <Badge>{describeCondition(condition)}</Badge>
                </InlineStack>
              ))}
            </InlineStack>
          </>
        ) : null}
      </BlockStack>
    </Card>
  );
}
```

- [ ] **Step 2: Render it in the editor**

In `app/routes/app.qualifiers.$id/route.tsx`: import the component, locate where the loaded qualifier is available (the loader payload is `{ qualifier }`; find it with `grep -n "qualifier" app/routes/app.qualifiers.\$id/route.tsx | head`), and render — only when editing an existing audience (`qualifier` non-null) — as the first element of the page content:

```tsx
{qualifier ? (
  <AudienceInsights
    customers={qualifier.customers}
    conditions={qualifier.conditions}
    conditionLogicType={qualifier.conditionLogicType}
    lastSyncedAt={qualifier.lastSyncedAt}
  />
) : null}
```

If the route's JSX wraps sections in Polaris `Layout.Section`, put the panel in its own `Layout.Section` above the name/description card. Loader data over the wire is JSON — dates arrive as strings, which the component accepts (`string | Date | null`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v polaris-types` and `npx eslint` on both files — expected: clean.
Run: `npm run dev` — open an existing audience: insights card renders with stats, country bars, and readable condition chips; a new audience (`/app/qualifiers/new`) shows no insights card.

- [ ] **Step 4: Commit**

```bash
git add 'app/routes/app.qualifiers.$id/components/AudienceInsights.tsx' 'app/routes/app.qualifiers.$id/route.tsx'
git commit -m "feat: audience insights panel in the editor"
```

---

### Task 8: Export members as CSV (client-side)

**Files:**
- Create: `app/services/audiences/membersCsv.ts`
- Test: `app/services/audiences/membersCsv.test.ts`
- Modify: `app/routes/app.qualifiers.$id/components/AudienceInsights.tsx` (Export button)

Client-side generation avoids embedded-app auth issues with download URLs; the members are already in the loader payload.

- [ ] **Step 1: Write the failing test**

```ts
// app/services/audiences/membersCsv.test.ts
import { describe, expect, it } from "vitest";
import { membersToCsv } from "./membersCsv";

describe("membersToCsv", () => {
  it("renders a header and escapes fields", () => {
    const csv = membersToCsv([
      {
        firstName: 'Ada "The Countess"',
        lastName: "Lovelace",
        email: "ada@example.com",
        country: "United Kingdom",
        amountSpent: "1912.50",
        orderCount: 7,
      },
      {
        firstName: null,
        lastName: null,
        email: null,
        country: null,
        amountSpent: null,
        orderCount: null,
      },
    ]);

    expect(csv.split("\n")).toEqual([
      "first_name,last_name,email,country,total_spent,order_count",
      '"Ada ""The Countess""",Lovelace,ada@example.com,United Kingdom,1912.50,7',
      ",,,,,",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/services/audiences/membersCsv.test.ts`
Expected: FAIL — cannot resolve `./membersCsv`.

- [ ] **Step 3: Write the implementation**

```ts
// app/services/audiences/membersCsv.ts
/** CSV for audience member export. Client-safe (used from the editor UI). */

export type CsvMember = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  country: string | null;
  amountSpent: string | null;
  orderCount: number | null;
};

const HEADER = "first_name,last_name,email,country,total_spent,order_count";

function escapeField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function membersToCsv(members: CsvMember[]): string {
  const rows = members.map((m) =>
    [m.firstName, m.lastName, m.email, m.country, m.amountSpent, m.orderCount]
      .map(escapeField)
      .join(","),
  );
  return [HEADER, ...rows].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/services/audiences/membersCsv.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the Export button to AudienceInsights**

In `AudienceInsights.tsx`: extend `Props.customers` to `AudienceMember & Partial<CsvMember>` (the loader's customer rows carry all these fields), add imports:

```tsx
import { Button } from "@shopify/polaris";
import { ExportIcon } from "@shopify/polaris-icons";
import { membersToCsv, type CsvMember } from "app/services/audiences/membersCsv";
```

Add a download handler inside the component:

```tsx
  const handleExport = () => {
    const csv = membersToCsv(customers as CsvMember[]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audience-members.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
```

And render next to the "Audience insights" heading (inside the existing header `InlineStack`):

```tsx
          <Button
            icon={ExportIcon}
            onClick={handleExport}
            disabled={stats.memberCount === 0}
          >
            Export CSV
          </Button>
```

- [ ] **Step 6: Verify and commit**

Run: `npx vitest run` (all app tests pass), `npx tsc --noEmit 2>&1 | grep -v polaris-types`, `npx eslint` on touched files, `npm run build`.
Manual: export from an audience with members — the CSV opens with header + one row per member.

```bash
git add app/services/audiences/membersCsv.ts app/services/audiences/membersCsv.test.ts 'app/routes/app.qualifiers.$id/components/AudienceInsights.tsx'
git commit -m "feat: export audience members as CSV"
```

---

## Explicitly out of scope (YAGNI)

- **Growth-over-time charts** — needs membership history tables we don't have; revisit if merchants ask.
- **Audience overlap matrix** — computable but low-value at current audience counts.
- **Scheduled auto-refresh** — manual refresh covers the need; a cron/webhook sync is a separate project.
- **Raising the 50-customer search limit** — `getCustomers` pagination is a pre-existing constraint shared with the editor; fixing it is its own task across both flows.

## Final verification (after Task 8)

1. `npx vitest run` — all suites pass (existing 27 + new audience tests).
2. `npx tsc --noEmit 2>&1 | grep -v polaris-types` — clean.
3. `npm run build` — clean.
4. `npm run dev` manual pass: index stat cards, table metrics, tooltip conditions, refresh, editor insights, CSV export, delete, pagination, empty state (delete all audiences on a test store).

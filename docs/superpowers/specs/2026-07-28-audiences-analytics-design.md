# Audiences: customer analytics + builder refactor

Date: 2026-07-28 · Branch: `qualifiers-analytics`

## Goal

The Audiences module is the app's free offer, so its index page must earn its
keep: give merchants real customer insights up front (charts, not just counts),
keep the audiences table below, and make creating an audience feel modern and
reliable. Along the way, fix the real bugs found in the conditions/query
pipeline.

## 1. Index page (`app.qualifiers._index`)

Layout, top to bottom:

1. **Customer insights** (new) — store-wide analytics computed in the loader
   from the Shopify Admin API (not from audience snapshots):
   - Stat tiles: **Total customers** (`customersCount`), **Repeat buyers %**
     (2+ orders), **Average lifetime spend**, **New this month**.
   - **Customers by country** — donut, top 5 countries + "Other", with a
     legend table (country, customers, share). Palette: validated categorical
     slots 1–5 + neutral gray for Other; the visible legend table satisfies
     the contrast relief rule.
   - **Lifetime spend distribution** — single-series bar chart over buckets
     Never purchased / under $50 / $50–200 / $200–500 / $500+; brand violet
     `#5C3D99` (validated ≥3:1), direct value labels.
   - **New customers by month** — last 6 months, single-series bars, same hue.
   - Charts are inline SVG (no new dependency), with per-mark hover tooltips,
     recessive grid, thin marks with rounded data ends, 2px segment gaps.
   - Sampling is honest: when the store has more customers than the sample,
     the section is captioned "Based on your …most recent N customers".
2. **Audience reach** — the existing three summary tiles (unchanged).
3. **Audiences table** — the existing IndexTable (unchanged).

Data plumbing: new GraphQL query (id, createdAt, numberOfOrders,
amountSpent.amount, defaultAddress.country; `first: 250`, newest-first) +
`customersCount`, and a pure `computeCustomerInsights()` in
`app/services/audiences/customerInsights.ts` with vitest coverage. Analytics
failures degrade gracefully: the section hides rather than breaking the page.

## 2. Create/edit page refactor (`app.qualifiers.$id`)

One form, one source of truth. The duplicated `useFilterCustomersForm` (which
kept a second copy of conditions + logic and had to be kept in sync manually)
is deleted.

- `hooks/useAudienceForm.ts` — name, description, logic, conditions (each row
  carries a stable client key), the preview fetcher, submit/validation.
- `components/DetailsCard.tsx` — name + description.
- `components/ConditionsBuilder.tsx` — modern builder: header with inline
  "all/any" segmented toggle (driven by form state, not local state), rows of
  field → operator → smart value input with an icon remove button, an add
  button, and a live natural-language summary of the query built from
  `describeCondition`.
- `components/ConditionValueInput.tsx` — replaces `DyanmicInputs.tsx`:
  boolean conditions get a yes/no Select (not a free-text "true or false"),
  dates a date input, numbers/currency numeric inputs.
- `components/PreviewCard.tsx` — replaces `CustomersQueryQualifier`: matching
  customers auto-preview (debounced) once conditions are complete, member
  count headline, table of name/country/spent/orders.
- `route.tsx` — two-column layout: details + builder in the main column,
  preview in the secondary column; `AudienceInsights` stays on edit.

## 3. Query engine + data fixes (`app/utils/queryEngine.ts`, customers query)

- `not_equals` was checked as `"not-equals"` — negation never fired. Fixed and
  emitted as `-field:value`.
- `tag_not` mapped to a nonexistent `tag_not` search field — now emits
  `-tag:value`.
- Values containing spaces are quoted (`country:"United States"` used to emit
  a broken two-token query).
- Order counts come from `numberOfOrders` instead of counting
  `orders(first: 40)` edges (which silently capped at 40 and over-fetched).
- Country comes from `defaultAddress` instead of `addresses[0]`.
- `customer_date` / `updated_at` gain on/after/before operators in the builder.
- Vitest coverage for `buildCustomerQuery`.

## 4. Bug fixes (found during review)

| Bug | Fix |
|---|---|
| Updating an audience always failed: `updateQualifierSchema` requires a string `id`, the form sends a number, so `.parse()` threw before submitting | schema takes `z.number()` |
| PUT handler fired `deleteManyConditions` without `await`, racing the re-creation of conditions | awaited |
| DELETE was not shop-scoped — any authenticated shop could delete another shop's qualifier/conditions by id | ownership verified before deleting |
| Edit page lost customers' last names (`refactorCustomers` dropped `lastName`; also one of the standing tsc errors) | field kept |
| Preview table rendered nothing while `fetcher.state === "loading"` (`a || (b ? … : …)` precedence bug) | rewritten |
| AND/OR toggle used local state initialized to AND — editing an OR audience displayed AND | driven by form state |
| Direct `customers.value = …` mutation bypassed react-form state | proper `onChange` |
| Condition rows keyed by array index | stable client keys |

## Out of scope

Pagination of preview results beyond Shopify's 50-customer page, audience
scheduling, and any change to the `Conditions` DB shape (stored strings stay
strings; only matching/UX changes).

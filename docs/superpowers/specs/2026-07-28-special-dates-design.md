# Special Dates — design plan

Date: 2026-07-28 · Status: awaiting approval, no code yet
Builds on the shipped assistant dashboard (Advance plan). Turns the AI
brief's ephemeral occasion cards into a persistent, manageable system:
special dates in the database, each the parent of to-dos and executed
actions, with the first real action being AI-optimized SEO metadata.

## 1. Data model

- **`SpecialDate`** — the parent. `name`, `date` (ISO day), `whyItMatters`,
  `source` (AI | MERCHANT), shop FK, timestamps. Unique per
  `(shop, name, date)`. AI brief generation **upserts** its occasions here
  (never deletes merchant-created rows); merchants create their own from
  the Special Dates page ("Grand reopening", "Local wedding expo").
- **`SpecialDateTodo`** — checklist items under a date. `title`,
  `description?`, `kind` (SEO | MARKETING | GENERAL), `source`
  (AI | MERCHANT), `done`, `position`. AI generates a starter set per date
  (~4 SEO + ~4 marketing); merchants add, check, and delete their own.
  The dashboard's global "Get your shop ready" list stays as-is; these are
  per-date.
- **`SeoMetaAction`** — the audit trail of executed SEO actions. One row
  per applied change: `resourceType` (PRODUCT | COLLECTION), `resourceId`,
  `resourceTitle`, `previousSeoTitle`, `previousSeoDescription`,
  `newSeoTitle`, `newSeoDescription`, `specialDate` FK, shop, timestamp.
  Storing previous values makes a future "revert" one mutation away and
  gives the manage page an "applied changes" history.
- **`AiUsage`** — token accounting per store, DB-only (no UI yet). One row
  per Gemini call: shop, `feature` (brief | niche-inference | date-todos |
  seo-meta), `model`, `inputTokens`, `outputTokens`, `totalTokens`,
  timestamp. Gemini responses already include `usageMetadata` — the client
  starts returning it and every call site records a row. Aggregation
  (per-store monthly sums) is a query away when billing/limits need it.

## 2. AI lifecycle

- **Brief → dates**: when a dashboard brief generates, its occasions are
  upserted into `SpecialDate` (source AI). The dashboard occasion rail now
  reads from the table and each card gains **Manage**, linking into the
  detail page. Merchant dates appear in the rail alongside AI ones.
- **Per-date to-dos are generated lazily** — on first open of a date's
  manage page (or via a "Suggest to-dos" button), one structured Gemini
  call produces the SEO + marketing starter set, grounded in the niche
  profile and the date. Lazy generation means no fan-out of AI calls at
  brief time and no cost for dates the merchant never opens.
- Every call records `AiUsage`. Failures fall back to a small curated
  to-do set (pattern proven in the brief service).

## 3. The SEO meta optimizer (first real action)

On a special date's manage page, "SEO" section — built for speed:

1. **Browse** — tabs for Products | Collections with search, showing each
   item's current SEO title/description (or "using defaults") so gaps are
   visible at a glance. Paginated Admin API reads.
2. **Select & generate** — checkboxes, then one "Generate suggestions"
   click sends the whole selection in a single batched Gemini call
   (structured array out): per item, an SEO title ≤60 chars and meta
   description ≤160 chars woven around the special date, the niche, and
   the item's own name — factual, no keyword stuffing.
3. **Review & apply** — each row shows current → suggested side by side,
   suggestion editable inline. "Apply" per row or "Apply all" runs
   `productUpdate`/`collectionUpdate` with `seo: { title, description }`
   (write_products covers both) and writes the `SeoMetaAction` audit row.
   Applied rows show a success state and land in the date's history list.

Marketing actions in v1 are the to-do list only (AI-suggested + merchant
items); executable marketing actions (campaigns, emails) are a later
phase and the spec keeps the `kind` enum ready for them.

## 4. Routes & navigation

- Sidebar: new **Special dates** item → `/app/special-dates`.
- `app.special-dates._index` — table of dates (name, date, days away,
  source badge, to-do progress), "Add special date" (name, date, note),
  delete for merchant-created rows, archive for AI rows.
- `app.special-dates.$id` — the manage page: header (name, countdown,
  why-it-matters), the to-do board grouped SEO / Marketing / General, and
  the SEO optimizer section with its applied-changes history.
- `api.special-dates` — CRUD + todo add/toggle/delete + suggest-todos.
- `api.seo-meta` — resource listing, suggestion generation, apply.
- Everything Advance-gated (`hasAssistant`), same as the dashboard.

## 5. Relationship to the existing Occasions module

Occasions (Smart Recommendations curation) and Special Dates overlap in
name but not in job: Occasions power the storefront widget; Special Dates
power the merchant's preparation. v1 keeps them separate and honest about
it; a natural phase 2 is a "create matching Occasion" shortcut on a
special date so curation and prep meet. Not in this build.

## 6. Build order (one branch, commit per phase, single PR)

1. **Schema + token tracking** — four models + migration; Gemini client
   returns `usageMetadata`; `recordAiUsage` wired into brief + niche
   inference call sites; brief→SpecialDate sync.
2. **Special Dates routes** — nav item, index with manual create, manage
   page with the to-do board (AI suggest + merchant items).
3. **SEO optimizer** — resource browsing, batched suggestions, apply
   mutations + audit rows.
4. **Dashboard integration + polish** — rail reads SpecialDates, Manage
   links, screenshot review, PR.

## 7. Decisions (assumed defaults — flag to change)

1. Apply writes SEO metadata **immediately** on click (previous values
   stored for future revert) — no draft/approval queue.
2. AI to-do starter set: ~4 SEO + ~4 marketing per date.
3. Suggestion batch size cap: 25 resources per generate click.
4. Token tracking is silent v1 (DB rows only, no admin UI/limits).

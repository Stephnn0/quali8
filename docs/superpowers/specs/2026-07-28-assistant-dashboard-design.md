# Niche-aware AI assistant dashboard — design plan

Date: 2026-07-28 · Status: v1 implemented (branch assistant-dashboard)
Decisions: Gemini key provisioned (Cloud Run); gemini-2.5-flash; the
dashboard is replaced entirely; gated behind the new Advance plan
($25/month, handle "advance", level ADVANCE) — Free/Pro see the pitch +
upgrade CTA.
Vision: the app dashboard adapts to the merchant's business — "your
assistant to get the shop ready for the occasions that matter in your
niche." SEO and marketing/conversion tracking come later; v1 is the
dashboard and the AI brief behind it.

## 1. The one-step onboarding (don't overwhelm)

We already know more than we need to ask. `ShopifyShopData` stores country,
currency, timezone, and locale; the Admin API gives us product types, titles,
and tags. So onboarding is a single confirmation card, not a form:

> **"Looks like you run a flower shop in the United States — is that right?"**
> [Yes, that's me] [Change]

- Niche is **inferred server-side** before first render: fetch ~50 product
  titles/types/tags, ask Gemini to classify into our taxonomy (below), with
  a deterministic keyword fallback when the API is unavailable.
- "Change" opens a Combobox over the taxonomy plus free text, and an optional
  one-line "anything else we should know?" note. Country pre-filled,
  editable. That's the entire onboarding: one confirm, two optional edits.

**Niche taxonomy** (curated, ~30 verticals so classification is *accurate*
across what Shopify stores actually sell — AI classifies INTO it rather than
inventing labels): flowers & gifting, fashion & apparel, jewelry &
accessories, beauty & cosmetics, food & beverage, coffee & tea, bakery &
sweets, pets, home decor, furniture, kitchen & dining, electronics & gadgets,
toys & games, baby & kids, sports & outdoors, fitness, books & stationery,
art & prints, candles & fragrance, health & supplements, plants & garden,
party supplies, crafts & DIY, vintage & collectibles, automotive, music
instruments, travel goods, eco & zero-waste, adult, other (free text).
Stored as slug + display label; "other" keeps the merchant's own words and
is passed verbatim to the AI.

## 2. The AI brief (Gemini)

One structured generation per shop, cached — never a live call per page view.

- **Model**: `gemini-2.5-flash` via the REST API, temperature 0,
  `responseMimeType: application/json` with a `responseSchema`, then zod
  re-validation server-side. Key in `GEMINI_API_KEY` (added to the env
  schema as optional — the dashboard fully works without it, see fallback).
- **Input context**: niche, country, merchant note, today's date, timezone,
  currency, plus store facts the app already knows: product count, whether
  audiences/promotions/bundles/occasions exist yet, plan level. This lets
  the checklist point at concrete next steps in the app and the store.
- **Output (the "brief")**:
  - `insight` — 2–3 sentences: what matters in this niche right now.
  - `occasions[]` — the next ~90 days of dates that matter for this niche
    in this country: `{ name, date, whyItMatters, suggestedAction }`.
  - `checklist[]` — 5–8 store-readiness tasks: `{ id, title, description,
    category: store|inventory|marketing|app }`, mixing Shopify-store prep
    ("photograph your Mother's Day arrangements") with in-app setup
    ("curate products for your Mother's Day occasion").

**Accuracy strategy** (dates are where LLMs embarrass you):
- A small **verified core-dates module** computes the movable/major dates
  deterministically per country-year (Valentine's, Mother's/Father's Day
  variants by country, Easter, Black Friday, Christmas…). These are ground
  truth and are *given to* Gemini in the prompt.
- Gemini's job is the *niche layer*: which of those dates matter for this
  niche, plus niche-specific additions (prom/wedding season for florists,
  National Coffee Day, Adopt-a-Shelter-Pet month…). Every returned date is
  validated: parseable ISO, within the next 120 days, else dropped.
- Everything is presented as suggestions; nothing auto-executes.

**Caching & lifecycle**: brief stored in a `DashboardBrief` row (shop,
niche, country, `payload Json`, generatedAt). Regenerated when: profile
changes, merchant taps Refresh, or the brief is >7 days old (regeneration
happens in the loader's background, stale brief shown meanwhile — the
dashboard never blocks on Gemini). Checklist done-states persist as ids in
the profile row so a regeneration doesn't un-check finished work.

**Fallback (no key / API error)**: curated static briefs per taxonomy slug
(the florist one hand-written first, a generic one for the rest) built from
the core-dates module — so the feature degrades to "accurate but less
personalized," never to an error or an empty dashboard.

## 3. Dashboard UI (app._index v2)

- **No profile yet** → the hero becomes the onboarding moment: assistant
  intro copy ("Quali8 is your shop's occasion assistant") + the one-step
  confirmation card.
- **Profile confirmed** →
  1. **Assistant header** — "Your flower shop assistant" + the insight
     paragraph + Refresh; niche/country pills that reopen the editor.
  2. **Upcoming dates** — horizontal cards: big date badge (days away),
     name, why-it-matters line, suggested-action chip. Visuals are on-brand
     generated art (violet/gold duotone gradients + occasion glyphs, like
     the dashboard's existing illustration language) — no stock photos, no
     hotlinked images.
  3. **Get your shop ready** — the checklist with checkboxes, category
     tags, and a progress bar; app-category items deep-link into the app.
  4. Existing sections (Your plan, What Quali8 does, storefront previews)
     stay below, so current merchants lose nothing.

## 4. Architecture

- `app/services/assistant/`
  - `taxonomy.ts` — niches list (client-safe)
  - `coreDates.ts` — deterministic country-year dates + vitest coverage
  - `inferNiche.server.ts` — product sampling + classification (+ keyword
    fallback)
  - `gemini.server.ts` — REST client, responseSchema, zod validation,
    timeouts, never-throws interface
  - `brief.server.ts` — orchestration: build context → generate → validate
    → persist; fallback selection
  - `fallbackBriefs.ts` — curated static briefs
- Prisma: `StoreProfile` (1:1 ShopifyStore: niche, nicheLabel, country,
  note, checklistDone String[]) and `DashboardBrief` (latest per shop).
- Routes: `app._index` loader returns profile + brief;
  `api.assistant` action handles confirm/edit profile, refresh brief,
  toggle checklist item (fetcher-based, matching app conventions).
- Env: `GEMINI_API_KEY` optional in `app/utils/server/env.ts`.
- Plan gating: **free for all plans** — this dashboard is the app's hook
  and its cost is pennies (one flash call per shop per week); a per-plan
  refresh limit can come later if needed.

## 5. Build order (one PR per phase, as usual)

1. Schema + taxonomy + core dates (+ tests) + curated fallbacks.
2. Gemini client + niche inference + brief service (+ tests with mocked
   fetch).
3. Onboarding + assistant dashboard UI + api.assistant.
4. Screenshot review, polish, docs.

Out of scope for v1 (explicitly future): SEO setup/tracking, marketing and
conversion tracking, agent-executed actions, email/notification digests.

## 6. Decisions needed before coding

1. **GEMINI_API_KEY** — create one in Google AI Studio and add it to the
   Cloud Run env and your local `.env`. Without it the feature ships in
   fallback mode (works, less personalized).
2. Model: `gemini-2.5-flash` (recommended) — or flash-lite (cheaper) /
   pro (smarter, slower, pricier)?
3. Keep the existing dashboard sections below the assistant (recommended)
   or replace the dashboard entirely?
4. Free for all plans (recommended) or Pro-gated?

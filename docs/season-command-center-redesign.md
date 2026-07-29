# Quali8 — Season Command Center redesign

Repositioning the app from "toolbox of features" to **Seasonal Revenue
Optimization platform**: a merchant installing Quali8 should immediately
understand *"this app prepares my store for upcoming sales seasons and helps
me increase seasonal revenue."*

Items marked **[shipped]** are implemented in this branch; the rest is the
agreed direction for follow-up work.

---

## 1. Sidebar structure **[shipped]**

App Bridge `<NavMenu>` renders flat text links inside the Shopify admin
sidebar — it supports neither icons nor nesting. So the sidebar carries the
*top-level mental model* (7 items, seasonal workflow first) and each hub page
does the visual grouping with cards. Icons below are for the in-page hubs
(Polaris icon names).

| # | Label | Route | Icon (in-page) | Rationale |
|---|-------|-------|----------------|-----------|
| 1 | Home | `/app` | `HomeIcon` | The Season Readiness Dashboard — the command center itself. |
| 2 | Sales Calendar | `/app/special-dates` | `CalendarIcon` | The core moat and the #1 workflow: every date owns its campaigns, SEO, and prep lists. Placed first after Home. |
| 3 | Recommendations | `/app/occasions` | `MagicIcon` | Occasion-based product picks (theme block). "Occasions" alone read as a duplicate of Special dates; naming it by its *outcome* removes the collision. |
| 4 | Promotions | `/app/actions` | `DiscountIcon` | Hub for shipping discounts + bundles. Bundles stays nested here — it's a promotion type, not a top-level concept. |
| 5 | Audiences | `/app/qualifiers` | `PersonSegmentIcon` | Who the seasons are for. Supports promotions; comes after the revenue actions. |
| 6 | Content & SEO | `/app/faqs` | `SearchIcon` | Always-on content (collection FAQs). Per-date SEO stays inside the Sales Calendar where it has context. |
| 7 | Plans & billing | `/app/settings` | `CreditCardIcon` | Renamed from "Subscriptions", which merchants read as *product* subscriptions. Last, as convention dictates. |

Removed from nav: nothing merchants used. Kept hidden: Campaigns (WIP,
`app.campaings.*`), `/app/tools/products` (stub).

**Grouping rule:** secondary features live under the page that gives them
context — theme actions, AI SEO, and to-do lists under each Sales Calendar
date; bundles under Promotions; customer insights under Audiences.

---

## 2. Season Readiness Dashboard **[shipped]**

Section order tells the story *"a moment is coming → how ready am I → what
exactly is coming → what tools are on/off → do the work"*:

1. **Hero** — gradient banner, eyebrow "Season Command Center", headline
   leads with urgency: **"Mother's Day is in 12 days — is your store
   ready?"** plus the AI insight and niche/country/brief pills. The next
   revenue moment, not the app, is the subject of the sentence.
2. **Readiness score** — a single % with a `ProgressBar` and five pillar
   badges (Storefront campaigns, SEO & content, Recommendations, Promotions,
   Audiences). Score = 50% prep-checklist completion + 10% per activated
   pillar. One number a merchant can move today, with the formula stated on
   the card so it never feels arbitrary.
3. **Upcoming events rail** — horizontal cards per special date (date badge,
   countdown, why it matters, suggested action, Manage → the date's
   workspace). Kept from the previous dashboard; it's the calendar made
   tangible.
4. **Season toolkit (status grid)** — four cards: Storefront campaigns
   (N scheduled), SEO & content (N SEO updates · N FAQs), Recommendations
   (N occasions), Promotions (N discounts · N bundles). Each: Active/To-do
   badge, metric, one CTA. Fixes the old dashboard's dead end — it linked
   only to special dates; now every pillar is one click away, and "To do"
   badges are the priority-action signal.
5. **Season prep checklist** — the AI checklist (renamed from "Get your shop
   ready"), now explicitly the thing feeding half the readiness score.
6. Quick actions live as the CTAs inside the readiness/status cards rather
   than a separate button row — every action is next to the number that
   justifies it.

**Free/Pro home page [shipped]:** previously a bare Advance pitch. Now a
`SeasonOverview`: the same hero framing, a rail of *computed* upcoming
commerce dates (`upcomingCoreDates`, no AI cost), status cards for what the
plan includes (Audiences, Promotions), and the Advance upsell reframed as
"Unlock the full Season Command Center". New installs see seasonal value in
the first five seconds, on every plan.

---

## 3. First-install onboarding (3 steps, <2 minutes)

Step 1 exists today (`OnboardingCard`, reworded **[shipped]**). Steps 2–3 are
the proposed follow-up, as a `CalloutCard`/wizard on the dashboard after
profile confirmation:

**Step 1 — Confirm your store profile** (~20s)
- *"Looks like you run a florist store — is that right?"*
- Niche pre-inferred from the catalog, country pre-filled from the shop.
- Primary CTA: **Build my sales calendar** · Secondary: *Change niche*

**Step 2 — Meet your next sales season** (~30s)
- *"Here's what's coming for your store."* Shows the generated calendar with
  the next date highlighted and its ready-made prep plan (campaigns, SEO,
  to-dos).
- Primary CTA: **Open [next date]'s plan** · Secondary: *See the full calendar*

**Step 3 — Put Quali8 in your theme** (~60s)
- *"Two blocks make your campaigns and recommendations visible to
  shoppers."* Deep links into the theme editor to add the storefront blocks
  (announcement/hero render via app proxy; Smart Recommendations and
  Collection FAQs are theme blocks).
- Primary CTA: **Add theme blocks** · Secondary: *I'll do this later*

Value moment: by step 2 the merchant has a personalized revenue calendar
without creating anything by hand.

---

## 4. Feature organization

| Feature | Category | Tier |
|---|---|---|
| AI special dates + per-date workspace | Sales Seasons | **Primary** |
| Marketing readiness checklist (dashboard) | Sales Seasons | **Primary** |
| Theme actions (announcement bar, hero, popup, menu item) | Campaigns | **Primary** (surfaced through each date) |
| AI meta titles & descriptions | SEO | **Primary** (inside each date) |
| SEO to-do list | SEO | Secondary (inside each date) |
| Collection FAQs | SEO | Secondary (own page: Content & SEO) |
| Occasion recommendations (theme extension) | Recommendations | **Primary** |
| Audience segments & analytics | Audience | Secondary |
| Shipping discounts | Growth Tools | Secondary (Promotions hub) |
| Product bundles | Growth Tools | Secondary (Promotions hub) |
| Marketing to-do list | Sales Seasons | Secondary (inside each date) |
| Campaigns model (`campaings`, WIP) | — | **Hidden** until finished |
| Product editor (`/app/tools/products`, stub) | — | **Hidden** ("More tools" if ever revived) |

Principle: nothing merchant-facing goes behind "More tools" today — with 7
nav items there's no clutter to hide. Hidden = unfinished.

---

## 5. Polaris page structure (main dashboard)

```text
Page
└─ BlockStack gap="500"
   ├─ [Hero banner — branded CSS module, gradient]
   │  └─ InlineStack align="space-between"
   │     ├─ eyebrow + h1 countdown headline + insight + meta pills
   │     └─ Button icon={RefreshIcon} (refresh brief)
   ├─ Card                                  ← Season readiness
   │  └─ BlockStack gap="400"
   │     ├─ InlineStack align="space-between"
   │     │  ├─ Text h2 "Season readiness"
   │     │  └─ Text headingLg "{score}%"
   │     ├─ ProgressBar size="small"
   │     ├─ InlineStack wrap  → Badge ×5 (pillars)
   │     └─ Text bodySm subdued (how the score works)
   ├─ BlockStack gap="300"                  ← Upcoming events
   │  ├─ Text h2 "Coming up for your shop"
   │  └─ [rail — CSS module] → OccasionCard ×8 → Button "Manage"
   ├─ BlockStack gap="300"                  ← Season toolkit
   │  ├─ Text h2 "Your season toolkit"
   │  └─ InlineGrid columns={{xs:1, sm:2, lg:4}}
   │     └─ Card ×4
   │        └─ BlockStack gap="200"
   │           ├─ InlineStack → Text h3 + Badge (Active/To do)
   │           ├─ Text bodySm medium (metric)
   │           ├─ Text bodySm subdued (description)
   │           └─ Button size="slim" (CTA)
   ├─ Card                                  ← Season prep checklist
   │  └─ BlockStack gap="400"
   │     ├─ InlineStack → Text h2 + "X of Y done"
   │     ├─ ProgressBar
   │     └─ BlockStack → (Checkbox + title + category Badge + desc) ×N
   └─ FooterHelp
```

(Polaris 12 components; if the app moves to the `s-*` web components,
mapping is 1:1: Card→`s-section`, InlineGrid→`s-grid`, Badge→`s-badge`.)

---

## 6. Top 10 UX quick wins

1. **[shipped]** Home page never a bare upsell — Free/Pro get the season
   overview with real dates. (activation, perceived value)
2. **[shipped]** Countdown-led hero ("X is in N days — is your store
   ready?"). (understanding, urgency → conversion)
3. **[shipped]** Readiness score — one number that gamifies setup and makes
   value measurable. (activation, retention)
4. **[shipped]** Status grid links the dashboard to every pillar — the old
   dashboard had exactly one outbound link. (activation)
5. **[shipped]** Naming pass: Sales Calendar, Occasion Recommendations,
   Plans & billing, Shipping Discounts, AI SEO Optimizer, SEO Prep List,
   Marketing Playbook. Nav labels, page titles, and copy now tell one
   seasonal story. (understanding, installs — listing screenshots)
6. Empty states that sell the outcome: every index page's empty state should
   name the *revenue outcome* and offer a one-click seeded example (e.g.
   "Add Valentine's Day and get a ready-made prep plan"). (activation)
7. Onboarding steps 2–3 (§3): show the generated calendar immediately, then
   deep-link theme-block install. (activation, time-to-value)
8. Group the 7 tiles on the date workspace under three headings — Storefront
   campaigns / Get found in search / Prep lists — so the mega-page reads as
   a plan, not a grid. (understanding)
9. Surface "theme block not installed" detection as a dashboard banner —
   campaigns and recommendations silently do nothing without the blocks
   today. (activation, support-ticket reduction)
10. App Store listing alignment: lead with "Sales Season Command Center",
    screenshots in dashboard→calendar→campaign order, niche keywords
    (florist, gift shop, jewelry…). (installs)

---

## 7. Renames **[shipped where noted]**

| Old (developer-speak) | New (seasonal platform) | |
|---|---|---|
| AI-generated special dates | **Sales Calendar** | shipped (nav + page title) |
| SEO todo list | **SEO Prep List** | shipped |
| Marketing todo list | **Marketing Playbook** | shipped |
| Recommendation extension | **Occasion Recommendations** (nav: "Recommendations") | shipped |
| Theme actions | **Storefront Campaigns** | shipped (dashboard status grid; date-page grouping pending) |
| Audience analytics | **Shopper Insights** | pending (section header inside Audiences) |
| AI meta titles & descriptions | **AI SEO Optimizer** | shipped |
| "Subscriptions" nav label | **Plans & billing** | shipped |
| "My Promotions" page | **Shipping Discounts** | shipped |

Naming rules applied: name the outcome, not the mechanism; one noun per
concept (a *date* lives on the Calendar, a *campaign* is what you launch for
it); no "AI-generated", "extension", "todo", or model names in merchant-facing
copy.

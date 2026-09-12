# Seasonal features split + Campaigns tab

Date: 2026-09-12

## Problem

Opening Smart Announcements, SEO AI, or Subscribe Boost from the OneApp
library landed on the Sales Calendar, because those "features" were only
cards inside a calendar date. A merchant who wanted the announcement bar had
to know to go through the calendar first.

## Decision

1. **Every card inside a Sales Calendar date becomes its own OneApp feature**
   in the Seasonal Marketing category: Smart Announcements (06), SEO AI (07),
   Subscribe Boost (08), Seasonal Hero (09), Smart Menu (10), SEO Prep List
   (11), Marketing Playbook (12). SEO AI and Subscribe Boost move out of
   Content & SEO / Customers into Seasonal Marketing.
2. **Sales Calendar leaves the feature library** and becomes the **Campaigns**
   nav tab (`/app/campaigns`), the future hub that switches every seasonal
   feature on and off per sales date. For now the tab is a coming-soon page.
3. The per-date data model is unchanged: one announcement bar, hero, popup,
   and menu item per `SpecialDate`, to-dos and SEO actions keyed by date.

## Shape

- `app/components/Seasonal/` holds the schedulers, to-do board, SEO
  optimizer, file picker (moved from the calendar route), shared types,
  date helpers, and `seasonalFeatures.ts` (the seven feature keys, their
  config copy, and `seasonalFeaturePath`).
- `app/services/seasonal/specialDateDetail.server.ts` owns loading one
  date's detail (with the lazy AI to-do generation) and applying every
  special-date mutation. The calendar detail route and the new feature
  routes both call it, so there is one source of truth.
- `app/services/seasonal/featureDates.server.ts` returns the upcoming dates
  with one feature's status on each, for the feature list pages.
- Routes:
  - `/app/seasonal/:feature` lists upcoming sales dates with this feature's
    state per date and lets the merchant add a date. Opens a date.
  - `/app/seasonal/:feature/:dateId` is the per-date config page; the
    schedulers post back to it.
  - `/app/campaigns` is the coming-soon hub, listed in the nav after the
    categories.
  - `/app/special-dates` and `/app/special-dates/:id` stay reachable by URL
    (no nav link, no registry entry) so nothing is lost while Campaigns is
    built.
- Feature illustrations: `public/features/{seasonal-hero,smart-menu,
  seo-prep-list,marketing-playbook}.svg`.

## Out of scope

- The actual Campaigns hub behaviour (activate/deactivate features per date).
- Changing how dates are created by the assistant brief.
- The legacy `app.campaings.*` routes and `Campaign` model (untouched).

## Revision (same day)

After review the split was narrowed:

- **Removed as features:** Smart Menu, SEO Prep List, Marketing Playbook.
  Their cards still exist inside a Sales Calendar date.
- **SEO AI moved to Content & SEO.**
- **No date list.** Opening Smart Announcements, Seasonal Hero, Subscribe
  Boost, or SEO AI lands directly on the editor. Each shop has one of each,
  stored as a row with `specialDateId: null` (migration
  `20260912000000_optional_special_date_on_configs` makes the column
  nullable on `AnnouncementBar`, `ScheduledHero`, `SubscribePopup`, and
  `SeoMetaAction`). The storefront proxies already pick by shop and date
  window, so a shop-wide row shows like any other.
- **Campaigns** is no longer in the sidebar; the coming-soon route remains
  reachable by URL.
- Routes are now `app.features.$feature` (`/app/features/<key>`); the
  `app.seasonal.*` routes and `featureDates.server.ts` are gone.

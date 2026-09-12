# Quali8 · OneApp

OneApp is an embedded Shopify admin app that bundles several storefront and checkout features under one install and one subscription. Merchants pick features from a library; each feature belongs to a category, and each category is an entry in the app's sidebar.

## How the admin is organised

- **Dashboard** (`/app`): the OneApp hero, every feature card grouped by category, and a "Need another feature?" request band.
- **Sidebar**: Dashboard, one link per category, Request a Feature, Plans & billing.
- **Category page** (`/app/categories/<key>`): one showcase card per feature with an illustration, a plan banner (Free or Advance), a short description, and a button that opens the feature.

### Categories and features

| Category | # | Feature | Plan | Opens |
|----------|---|---------|------|-------|
| Sales & Pricing | 01 | Smart Shipping | Advance | `/app/actions/discounts` |
| Sales & Pricing | 03 | Bundle Builder | Advance | `/app/bundles` |
| Customers | 02 | Customer Insights | Free | `/app/qualifiers` |
| Customers | 08 | Subscribe Boost | Advance | `/app/special-dates` |
| Content & SEO | 04 | FAQ Collections | Advance | `/app/faqs` |
| Content & SEO | 07 | SEO AI | Advance | `/app/special-dates` |
| Seasonal Marketing | 05 | Occasion Match | Advance | `/app/occasions` |
| Seasonal Marketing | 06 | Smart Announcements | Advance | `/app/special-dates` |
| Seasonal Marketing | 09 | Sales Calendar | Advance | `/app/special-dates` |

Features 06–08 are configured inside the Sales Calendar, so they share its route.

### Adding a feature

1. Add an entry to `ONEAPP_FEATURES` in `app/components/OneApp/features.ts` with its `category`, `plan`, `to` route and `gate`.
2. Add its illustration at `public/features/<key>.svg` (640×400).
3. Gate the feature's route with `gatekeepRoute` and open its index page with `FeatureHeader`.

The sidebar, dashboard and category page pick the new feature up automatically. Adding a category means adding it to `ONEAPP_CATEGORIES` and the `OneAppCategoryKey` union.

## Development

```bash
npm run dev            # shopify app dev — app + tunnel + extensions
npm run build          # production bundle
npm run lint
npm run setup          # prisma generate && prisma migrate deploy
npm run deploy         # shopify app deploy — pushes extensions + app config
```

See `CLAUDE.md` for the architecture, model layers, setup flow, billing and the Shopify Function contracts.

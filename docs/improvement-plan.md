# BCER Data Viewer — Improvement Plan

Status: **implemented** on branch `claude/dreamy-tesla-9yk4g8` (all four
workstreams). This document is retained as the design record; see the commit
history for the delivered changes.

Four workstreams, selected with the user:

1. Quick-win connections
2. Unify Search ↔ Map
3. Area / Formation profile pages
4. PWA + offline field mode

Each section lists: **goal**, **files touched**, **data-shape changes**, **UI behavior
(desktop + mobile)**, **risks**. Open decisions are collected at the end.

---

## Workstream 1 — Quick-win connections

**Goal:** wire up data/navigation that already exists but isn't linked. Low risk,
no data-shape changes.

### 1.1 Coordinates → Map
- `StatCard.tsx`: add optional `to?: string` prop; when present, wrap value in a
  `<Link>` (keep current plain render otherwise).
- `WellDetailPage.tsx`: pass `to={`/map?well=${waNum}`}` to the "Surface location"
  StatCard. Also add a small "View on map" action in the hero card.
- `SearchPage.tsx`: make the desktop "Coordinates" cell and the mobile card a link
  to `/map?well=${waNum}` (the map already deep-links via `?well=`).

### 1.2 Clickable dashboard charts + KPIs
- `DashboardPage.tsx`: add `onClick` to the **Top Areas** and **Top Formations**
  Recharts `<Bar>` (and the orientation donut) → navigate to the area/formation
  profile (Workstream 3) or `/search?area=…` until profiles land. Make the
  "Top Area" KPI card a link.
- Uses `useNavigate`; Recharts passes the datum to the bar `onClick` handler.

### 1.3 Full-result CSV export
- Today `exportResults` only serializes the current page (`results.items`,
  25–100 rows). Search is fully client-side, so we can export the entire filtered
  set.
- `static-data.ts`: extract the filter logic from `clientSearch` into
  `filterWells(wells, filters)` (returns all matching rows, unsorted/unpaginated)
  and have `clientSearch` call it. (Also reused by Workstream 2.)
- `SearchPage.tsx`: add "Export all N results" alongside the current "CSV"
  (current-page) button, using `filterWells`.

### 1.4 Theme toggle in the TopBar
- The toggle currently lives only in the sidebar footer and **disappears when the
  sidebar collapses to icons** (`group-data-[collapsible=icon]:hidden`).
- `TopBar.tsx`: add an icon theme toggle (import `useTheme`) in the top row, next
  to the sidebar trigger so it survives the two-row mobile header.
- `AppSidebar.tsx`: either remove the footer toggle (now redundant) or render an
  icon-only version that stays visible when collapsed. Keep the data-currency badge.

**Mobile:** toggle sits in the always-visible top row; coordinate links use the
existing 44px tap targets.
**Risk:** negligible. Pure UI/navigation.

---

## Workstream 2 — Unify Search ↔ Map

**Goal:** Search and Map already read the *same* `wells/search.json`. Make the Map
honor the same query params so a result set can be shown geographically, and let
Search hand off to it.

### Files
- `static-data.ts`: `filterWells(wells, filters)` (from 1.3) becomes the shared
  filter. `generateGeoJson` then runs on the filtered set.
- `MapPage.tsx`:
  - Read `useSearchParams`; build a filters object (area, formation, operator,
    orientation, waNumFrom/To, spud/rigRel/firstProd ranges, lat/lon) and feed
    `filterWells` → `generateGeoJson`.
  - Keep the existing map-only "data presence" toggles (`hasProduction`, etc.) as a
    second, map-specific refinement layered on top.
  - Surface inherited query filters as removable chips in the `FilterPanel` header
    with a "Clear all" that strips them from the URL.
- `SearchPage.tsx`: add a "View N results on map" button that links to
  `/map?${searchParams}` (reuses the live query string).

### Data-shape changes
None — same index, same GeoJSON shape.

**Mobile:** "View on map" button in the results header (wraps under the result
count); filter chips wrap inside the map's filter card
(`w-[min(280px,calc(100vw-1.5rem))]`).
**Risk:** low. Main care: the lat/lon bbox filters on Search now visibly affect the
map; keep the bbox inputs and map pan independent (don't auto-rewrite bbox on pan in
v1).

---

## Workstream 3 — Area / Formation profile pages

**Goal:** make Area and Formation first-class entities (they're top-10 dashboard
dimensions and operator breakdowns today but only ever run a flat search).

### New routes
- `/areas/:areaCode` and `/formations/:formCode`. Keyed by **code** (stable);
  display uses the description. (Codes resolve via existing `area_codes` /
  `formation_codes` tables.)
- Optional index routes `/areas`, `/formations` (overview lists) — phase 2.

### Data-shape changes (build-time JSON, mirrors operators)
New shared types in `packages/shared/src/index.ts`:

```ts
interface DimensionSummary {        // area or formation
  code: number;
  desc: string;
  wellCount: number;
  horizontalCount: number;
  totalGas3Yr: number;
  totalGas5Yr: number;
  operatorCount: number;
  topOperator: string | null;
  topFormation?: string | null;    // areas only
  topArea?: string | null;         // formations only
}

interface DimensionDetailData {
  summary: DimensionSummary;
  wells: WellSearchResult[];                 // sorted by gas_prod_3yr
  operatorBreakdown: { operator: string; operatorId: number; count: number }[];
  crossBreakdown: { desc: string; count: number }[];   // formations within area / areas within formation
  orientationBreakdown: { orientation: string; count: number }[];
  fiscalYearProduction: { label: string; value: number }[];  // aggregated like getProductionExplorer
}
```

### queries.ts
- `getAreaDetail(db, areaCode)` and `getFormationDetail(db, formCode)` — structurally
  like `getOperatorDetail`, grouping `well_search` by the dimension and joining
  `prd_profile_gas` for the fiscal-year series (reuse the `getProductionExplorer`
  fiscal-column discovery).
- `getAreaIndex(db)` / `getFormationIndex(db)` — distinct codes + summary stats.

### export-static.ts
- After the operators loop, add area/formation loops over
  `SELECT DISTINCT area_code …` / `form_code …`, writing
  `areas/{code}.json`, `formations/{code}.json`, plus `areas/index.json`,
  `formations/index.json`. (Counts are far smaller than the 326 operator files.)

### api.ts
- `fetchAreaDetail(code)`, `fetchFormationDetail(code)`, and index fetchers.

### New page components
- `AreaPage.tsx` + `FormationPage.tsx`, or one parameterized `DimensionProfilePage`.
  Layout mirrors `OperatorDetailView`: KPI row, breakdown charts, fiscal-year
  production bar, responsive wells table (desktop table / mobile cards), CSV export,
  "View all in search" and "Show on map" buttons (ties into Workstreams 1–2).

### Wiring (link sources to update)
- `DashboardPage.tsx` top-areas/top-formations bars (Workstream 1.2) → profiles.
- `DataTable.tsx` `linkForCell`: `area_desc`/`form_desc` currently → `/search`;
  decide whether name → profile and a secondary affordance → search (see open Qs).
- `WellAnalytics.tsx` "Area wells" / "Formation wells" buttons.
- `OperatorsPage.tsx` area/formation breakdown links.
- `TopBar.tsx` `useBreadcrumbs`: add `/areas`, `/formations` cases.
- `main.tsx`: register the new routes.

**Mobile:** identical responsive pattern to Operators (cards < md, table ≥ md).
**Risk:** medium — new query functions + exporter output. Add unit tests
(`tests/*.test.mjs`) for the new getters alongside the existing `api.test.mjs`.

---

## Workstream 4 — PWA + offline field mode

**Goal:** installable app that works in low/no-connectivity NE-BC field conditions.
The app is already static gzipped JSON + hash routing — well suited to a service
worker.

### Approach
Use `vite-plugin-pwa` (Workbox) for the manifest, app-shell precache, and runtime
caching. New dev dependency in `apps/web`.

### Files
- `apps/web/vite.config.ts`: add `VitePWA({...})`:
  - `manifest`: name "BCER Data Viewer", short_name "BCER", `display: standalone`,
    `theme_color` = primary cyan, `background_color`, `start_url`/`scope` = `/BCER/`
    in CI (matches `base`), icons 192/512 + maskable.
  - `workbox.navigateFallback` = `index.html` (hash routing makes this clean).
  - **Precache: app shell only** (JS/CSS/html). Do **not** precache `data/**` — the
    full dataset is ~68 MB gzipped.
  - `runtimeCaching`:
    - `data/**/*.json.gz` → StaleWhileRevalidate (or CacheFirst + expiration). First
      visit to a well/search/dashboard caches it → available offline thereafter.
    - `basemaps.cartocdn.com` tiles → CacheFirst with a capped `maxEntries` +
      expiration. **Caveat:** only tiles already viewed are available offline; a cold
      offline start shows a blank/partial basemap. Markers still plot. Respect CARTO
      ToS on cache size.
- `apps/web/index.html`: add `<meta name="description">`, `theme-color`,
  `apple-touch-icon`, `viewport-fit=cover`, favicon.
- `apps/web/public/`: add `favicon.svg`, `icon-192.png`, `icon-512.png`,
  `maskable-512.png` (derive from the existing Flame mark — **needs asset creation**).
- TopBar/UI: small **offline indicator** + a graceful "basemap needs a connection"
  notice on the Map when offline.

### Pipeline interaction (verified)
- `vite-plugin-pwa` generates the SW + precache manifest during `vite build`
  (`build:web`). `compress:static` runs **after** and only rewrites `dist/data`
  (gzip + delete raw `.json`). Since data is **runtime-cached, not precached**, the
  Workbox manifest isn't affected. Order in `build:static` stays the same.

### Risks
- **Storage:** must not precache the 68 MB dataset; rely on runtime cache with sane
  quota/expiration. iOS Safari has tighter storage/eviction.
- **Basemap offline** is the honest limitation (remote vector tiles). v1 = data +
  shell offline; opportunistic tile cache; clear messaging. Bundling an offline
  basemap is a much larger, separate effort.
- **SW update UX:** add an "update available — reload" prompt (vite-plugin-pwa
  `registerType: 'prompt'`).

---

## Suggested sequencing

1. **Workstream 1** (quick wins) — immediate, isolated, reviewable.
2. **Workstream 2** (Search↔Map) — depends on the `filterWells` refactor from 1.3.
3. **Workstream 3** (Area/Formation) — data + pages; profiles become the click
   target for 1.2/2.
4. **Workstream 4** (PWA) — last; benefits from the routes being stable, needs icon
   assets.

## Resolved decisions

1. **Area/Formation URL key** — **numeric code**. `/areas/:areaCode`,
   `/formations/:formCode`; description shown in the UI.
2. **Where `area`/`formation` names link** — **to the new profile page**. Each
   profile carries a "search these wells" button (and "show on map").
3. **PWA offline scope** — **data + app shell offline**; basemap tiles cached
   opportunistically, with clear messaging when offline. No bundled basemap in v1.
4. **App icons** — **generate from the existing Flame mark** + app colors
   (favicon.svg, 192/512, maskable-512).
5. **Map filter model** — **keep both**: map-only "data presence" toggles *plus*
   inherited Search query filters layered on top.

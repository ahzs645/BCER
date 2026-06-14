# Static JSON Data

The deployed web app is a static Vite build. It does not call the Fastify API in production. Instead, the API query layer is run at build time and exported as JSON files under `apps/web/public/data`.

## Generation Pipeline

The static data pipeline is:

```text
npm run build:static
  -> npm run export:static
  -> npm run build:web
  -> npm run compress:static
```

`npm run export:static` runs `apps/api/src/export-static.ts`.

That script:

1. Opens the SQLite database via `openDatabase()`.
2. Deletes and recreates `apps/web/public/data`.
3. Runs the same query functions used by the API from `apps/api/src/queries.ts`.
4. Writes JSON files with `JSON.stringify`.
5. Splits per-well detail data into batches so the app can lazy-load detail records.

`npm run build:web` copies `apps/web/public/data` into `apps/web/dist/data` as part of the Vite build.

`npm run compress:static` runs `apps/api/src/compress-static-data.ts`.

That script:

1. Recursively finds every `*.json` file in `apps/web/dist/data`.
2. Writes a gzip copy beside it as `*.json.gz`.
3. Deletes the original `*.json` from `dist/data`.

The source copies in `apps/web/public/data` stay uncompressed. The deployed GitHub Pages artifact contains only the compressed `*.json.gz` copies.

## Source Inputs

The export depends on the SQLite database at `data/bcer.sqlite` by default. That database is created from the source workbook and Access database by:

```bash
npm run import:data
```

The import command runs `scripts/import_bcer.py`, which reads:

- `View_BCER_Data_Most_Recent.xlsm`
- `data/DBS_BCER_Data_Most_Recent.accdb`

The static exporter expects the SQLite schema and derived tables created by that import step, especially `well_search` and the detail tables queried by `apps/api/src/queries.ts`.

## Generated File Catalog

Current uncompressed output under `apps/web/public/data` is about `652M` across `1124` JSON files. The compressed deploy copy under `apps/web/dist/data` is much smaller, roughly `68M` after gzip in a current build.

| Path | Producer | Consumer | Contents |
| --- | --- | --- | --- |
| `meta.json` | `getSourceMeta(db)` | Sidebar, Search, About, Well detail | Source metadata, data currency, import timestamp, and about text. |
| `dashboard.json` | `getDashboardData(db)` | Dashboard | Summary counts, top areas/formations, orientation breakdown, recent wells, and production leaders. |
| `aggregate-production.json` | `getAggregateProduction(db)` | Dashboard production charts | Aggregate monthly, calendar-year, and fiscal-year production series. |
| `production-explorer.json` | `getProductionExplorer(db)` | Production Explorer dashboard component | Fiscal-year list plus per-well production vectors used for client-side exploration. |
| `operators/index.json` | `getOperatorAnalytics(db)` | Operators page | Operator leaderboard data and summary analytics. |
| `operators/{operatorId}.json` | `getOperatorDetail(db, operatorId)` | Operator detail view | One file per operator containing summary, wells, area breakdown, formation breakdown, and orientation breakdown. |
| `wells/search.json` | `SELECT * FROM well_search`, mapped by `mapSearchRow()` | Search, Map, well lookup flows | Client-side search index with one compact record per well. |
| `wells/detail/manifest.json` | Detail batch loop in `export-static.ts` | Well detail loader | Batch index with `index`, `minWa`, and `maxWa` for each detail batch. |
| `wells/detail/batch-{index}.json` | `getWellDetail(db, waNum)` | Well detail page | Batched object keyed by WA number, containing full well detail records. |

Current batch counts:

- `wells/detail/batch-*.json`: `792` files.
- `operators/*.json`: `326` files including `operators/index.json`.
- Default well detail batch size: `50` wells per file.

The detail batch size can be changed with:

```bash
BCER_DETAIL_BATCH_SIZE=100 npm run export:static
```

Use a larger batch size to reduce request count. Use a smaller batch size to reduce the amount of detail data fetched for any single well page.

## Data Shapes

The TypeScript contracts live in `packages/shared/src/index.ts` and are re-exported by `apps/web/src/types.ts`.

Important exported shapes include:

- `SourceMeta`
- `DashboardData`
- `AggregateProductionData`
- `ProductionExplorerData`
- `OperatorAnalyticsData`
- `OperatorDetailData`
- `WellSearchResult`
- `WellDetail`

`wells/search.json` uses `WellSearchResult[]`.

Each `wells/detail/batch-{index}.json` file is a JSON object keyed by WA number:

```json
{
  "12345": {
    "overview": {},
    "activityLocations": [],
    "productionSeries": [],
    "calendarYearSeries": [],
    "fiscalYearSeries": [],
    "fracSummary": [],
    "fracDescriptions": [],
    "gasAnalysis": [],
    "recentGasAnalysis": [],
    "directionalSurvey": [],
    "drillingEvents": [],
    "casings": [],
    "payZones": [],
    "abandonment": []
  }
}
```

The exact nested fields are defined by `WellDetail` and the query functions that build each section.

## Frontend Loading

Frontend data access is centralized in `apps/web/src/lib/api.ts`.

That module delegates to `apps/web/src/lib/static-data.ts`, which builds URLs from:

```ts
const BASE = `${import.meta.env.BASE_URL}data`;
```

For GitHub Pages, Vite sets `BASE_URL` to `/BCER/`, so production requests use paths like:

```text
/BCER/data/wells/search.json.gz
/BCER/data/wells/detail/manifest.json.gz
/BCER/data/wells/detail/batch-0.json.gz
```

The loader tries compressed JSON first in production. It uses native `DecompressionStream` when available and falls back to `fflate` for browsers without native gzip stream support. If compressed loading fails, it tries the uncompressed `.json` path, which is useful in local builds and non-compressed hosting.

## Which Pages Load Which Files

| Page/component | Files loaded |
| --- | --- |
| Sidebar | `meta.json` |
| About | `meta.json` |
| Dashboard | `dashboard.json`, `aggregate-production.json`, `production-explorer.json` |
| Search | `meta.json`, `wells/search.json` |
| Map | `wells/search.json`, converted client-side to GeoJSON |
| Operators list | `operators/index.json` |
| Operator detail | `operators/{operatorId}.json` |
| Well detail | `wells/detail/manifest.json`, then the matching `wells/detail/batch-{index}.json`, plus `meta.json` |

## GitHub Pages Behavior

The GitHub Actions workflow `.github/workflows/deploy.yml` runs:

```bash
npm run build:static
```

and uploads:

```text
apps/web/dist
```

Because `compress:static` deletes `dist/data/**/*.json`, the live site should be expected to return:

```text
/BCER/data/wells/search.json.gz -> 200
/BCER/data/wells/search.json    -> 404
```

This is intentional for the deployed artifact. The app is responsible for fetching and decompressing `*.json.gz` in production.

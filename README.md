# BCER Data Viewer

React/Vite frontend plus a Fastify/SQLite API that replaces the Excel-based BCER workbook viewer.

## Prerequisites

- Node.js 25+
- Python 3 with `openpyxl`
- `mdbtools` available on the machine (`brew install mdbtools` on macOS)

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Import the BCER source files into SQLite:

   ```bash
   npm run import:data
   ```

3. Start the API and frontend together:

   ```bash
   npm run dev
   ```

The API listens on `http://127.0.0.1:3001` and the Vite app on `http://127.0.0.1:5173`.

## Build and test

```bash
npm run build
npm test
```

## Static data

The production site is deployed as static assets. JSON data is generated from SQLite during `npm run build:static`, copied into the Vite build, and compressed before GitHub Pages upload.

See [docs/static-json-data.md](docs/static-json-data.md) for the file catalog, generation pipeline, compression behavior, and frontend loading paths.

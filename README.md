# Operations Hub

`operations-hub` is a static React/Vite management dashboard intended to run on GitHub Pages and use Google Apps Script + Google Sheets as its backend and persistence layer.

## Current architecture

- Frontend: React 18 + TypeScript + Vite + Tailwind, built as a static site.
- Hosting: GitHub Pages via [`.github/workflows/deploy-pages.yml`](/home/matan/Documents/operations-hub/.github/workflows/deploy-pages.yml).
- Backend: Google Apps Script web app from [`src/apps-script/Code.gs`](/home/matan/Documents/operations-hub/src/apps-script/Code.gs).
- Data store: Google Sheets tabs listed in [`src/config.ts`](/home/matan/Documents/operations-hub/src/config.ts).

## Domain model

The frontend currently operates on one aggregated `InitialData` payload defined in [`src/types.ts`](/home/matan/Documents/operations-hub/src/types.ts):

- `employees`
- `departments`
- `vehicles`
- `equipmentTypes`
- `equipmentLedger`
- `foodProducts`
- `foodTransactions`
- `apartments`
- `qualifications`
- `employeeQualifications`

`vehicleTrips` exists in the Apps Script backend for audit/history writes, but the current UI does not render it yet.

## Runtime configuration

The frontend uses Vite environment variables instead of hardcoded deployment URLs:

1. Copy [`.env.example`](/home/matan/Documents/operations-hub/.env.example) to `.env.local`.
2. Set `VITE_GAS_URL` to the deployed Apps Script web app URL.
3. Keep `VITE_BASE_PATH=/operations-hub/` for GitHub Pages project-site deployment.
4. Use `VITE_USE_MOCK_DATA=true` only for explicit local demo/testing.

The production GitHub Pages workflow expects a repository secret named `VITE_GAS_URL`.

## Local development

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm run build
npm run test
npm run lint
```

## Data flow

- The app shell in [`src/pages/Index.tsx`](/home/matan/Documents/operations-hub/src/pages/Index.tsx) calls `fetchInitialData()`.
- [`src/api.ts`](/home/matan/Documents/operations-hub/src/api.ts) fetches the Apps Script payload and normalizes it.
- [`src/data/normalize.ts`](/home/matan/Documents/operations-hub/src/data/normalize.ts) converts raw sheet rows or camelCase objects into the typed frontend contract.
- Module pages derive their own summaries/tables from the in-memory `InitialData` object.

## Google Apps Script / Sheets setup

1. Create a Google Sheet with the tabs listed in [`src/config.ts`](/home/matan/Documents/operations-hub/src/config.ts).
2. Use the header names documented at the top of [`src/apps-script/Code.gs`](/home/matan/Documents/operations-hub/src/apps-script/Code.gs).
3. Paste [`src/apps-script/Code.gs`](/home/matan/Documents/operations-hub/src/apps-script/Code.gs) into the Apps Script editor attached to the spreadsheet.
4. Deploy as a Web App:
   1. Execute as: `Me`
   2. Who has access: `Anyone`
5. Put the deployment URL into `VITE_GAS_URL`.

## GitHub Pages deployment

The repo now includes an Actions workflow for GitHub Pages. Enable Pages in the repository settings with:

- Source: `GitHub Actions`

After that, pushes to `main` will build and deploy `dist/`.

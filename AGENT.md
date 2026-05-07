# Agent Notes

## Project Baseline

- `operations-hub` is a React/Vite RTL Hebrew operations dashboard backed by Google Apps Script and Google Sheets.
- The main repo context is maintained in [CONTEXT.md](/home/matan/Documents/operations-hub/CONTEXT.md).
- Frontend data is loaded as one aggregated `InitialData` payload and normalized in [src/data/normalize.ts](/home/matan/Documents/operations-hub/src/data/normalize.ts).

## Current Missions Behavior

- Default Missions table order: real mission date descending.
- Sortable Missions headers are intentionally limited to:
  - `תאריך`
  - `מחלקה`
  - `מפקד מאשר`
- Do not add header sorting to the other Missions columns unless product requirements change.
- Date sorting must use normalized underlying date values, not rendered `DD/MM/YY` text.

## Date Handling Guardrails

- Shared frontend date parsing/normalization lives in [src/utils.ts](/home/matan/Documents/operations-hub/src/utils.ts).
- `Camp_Tasks` dates are normalized in both:
  - frontend normalization: [src/data/normalize.ts](/home/matan/Documents/operations-hub/src/data/normalize.ts)
  - Apps Script payload shaping: [src/apps-script/Code.gs](/home/matan/Documents/operations-hub/src/apps-script/Code.gs)
- If a Google Sheet date cell is returned as a JS `Date`, Apps Script should serialize it to ISO `YYYY-MM-DD` before sending it to the frontend.

## Regression Coverage

- Mission ordering/sort coverage lives in [src/test/missionsPage.test.tsx](/home/matan/Documents/operations-hub/src/test/missionsPage.test.tsx).
- Date normalization coverage lives in:
  - [src/test/dateTimeUtils.test.ts](/home/matan/Documents/operations-hub/src/test/dateTimeUtils.test.ts)
  - [src/test/normalizeInitialData.test.ts](/home/matan/Documents/operations-hub/src/test/normalizeInitialData.test.ts)

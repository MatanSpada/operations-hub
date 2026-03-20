# Codex Context

## 1. Project Purpose And Architecture

- `operations-hub` is an RTL Hebrew operations dashboard.
- Frontend: static React 18 + TypeScript + Vite app, deployed to GitHub Pages.
- Backend: Google Apps Script web app in [src/apps-script/Code.gs](/home/matan/Documents/operations-hub/src/apps-script/Code.gs).
- Persistence: Google Sheets tabs defined in [src/config.ts](/home/matan/Documents/operations-hub/src/config.ts).
- The frontend loads one aggregated `InitialData` payload and derives all screens from it.

## 2. Main Modules / Screens

- Dashboard: high-level operational summaries.
- Food: products, transactions, apartment supply.
- Equipment: equipment catalog and issue/return ledger.
- Missions: Bahad 6 field tasks, now editable/searchable/deletable/exportable.
- Vehicles: active vehicle missions plus completed mission reporting/export.
- Workforce: reserve-duty oriented employee table with row-click editing.
- Qualifications: qualifications overview.
- Settings / Data Management: master-data management, employee creation, centralized smart export.

## 3. Important Google Sheets Tabs

- `Employees`
- `Departments`
- `Driving_Licenses`
- `Employee_Driving_Licenses`
- `Qualifications`
- `Employee_Qualifications`
- `Vehicles`
- `Vehicle_Trips`
- `Camp_Tasks`
- `Equipment_Catalog`
- `Equipment_Ledger`
- `Food_Catalog`
- `Food_Transactions`
- `Apartments`

## 4. Apps Script Deployment Notes

- Frontend expects `VITE_GAS_URL` to point to the latest deployed Apps Script Web App.
- After any backend/schema/action change, Apps Script must be pasted/deployed again manually.
- `Unknown action: ...` errors in the UI usually mean the live Apps Script deployment is older than the repo code.
- `.env.local` is local-only and usually gitignored. Git not showing it in `status` is expected.

## 5. Export / Report Behavior

- CSV export is handled in [src/utils.ts](/home/matan/Documents/operations-hub/src/utils.ts).
- All exports now add a serial-number column automatically as the first column.
- Central smart export lives in [src/modules/settings/SettingsPage.tsx](/home/matan/Documents/operations-hub/src/modules/settings/SettingsPage.tsx).
- “Export all tables” offers ZIP vs separate files.
- ZIP export is client-side and does not depend on Apps Script.
- Vehicles, Missions, and Workforce still keep local exports where useful, but smart export is centered in Data Management.

## 6. Mobile Responsiveness Expectations

- Preserve the existing mobile drawer/sidebar behavior from [src/pages/Index.tsx](/home/matan/Documents/operations-hub/src/pages/Index.tsx) and the layout components.
- Tables remain horizontally scrollable via the shared [src/components/shared/DataTable.tsx](/home/matan/Documents/operations-hub/src/components/shared/DataTable.tsx).
- Modals are bottom-sheet style on mobile and centered on larger screens via [src/components/shared/Modal.tsx](/home/matan/Documents/operations-hub/src/components/shared/Modal.tsx).
- New controls should stack cleanly on small screens and remain usable in RTL.

## 7. Date / Time Expectations

- Display dates as `DD/MM/YYYY`.
- Display time as 24-hour `HH:mm`.
- No AM/PM in operational UI.
- Shared helpers in [src/utils.ts](/home/matan/Documents/operations-hub/src/utils.ts) are the canonical place for date/time formatting.

## 8. Data Management Conventions

- Do not hardcode master data when it already exists as a managed sheet-backed entity.
- Employee edits/creation must persist through Apps Script, not local UI-only state.
- Use the existing design language: cards, simple bordered controls, RTL alignment, responsive stacking.
- Avoid inventing disconnected report-only data structures if the domain model already exists.

## 9. Recent Changes Already Implemented

- Vehicles were shifted from generic trip timing to mission-oriented records.
- Managed driving licenses were added and used by vehicles instead of hardcoded values.
- Bahad 6 field tasks were moved out of Vehicles into a dedicated Missions tab.
- Vehicle close flow now uses end date/time with computed duration.
- Missions are now editable, searchable, deletable, and treatment summary is optional.
- Workforce rows are clickable/editable.
- Data Management employee creation supports qualification and driving-license assignment.
- Data Management now has centralized smart export.
- Employee driving-license assignments are stored in `Employee_Driving_Licenses`.

## 10. Manual Steps Often Required After Backend Changes

- Update Google Sheet headers/tabs if the repo added/changed schema.
- Paste the latest [src/apps-script/Code.gs](/home/matan/Documents/operations-hub/src/apps-script/Code.gs) into Apps Script.
- Redeploy the Apps Script Web App.
- Ensure local/production `VITE_GAS_URL` points to that latest deployment.

## 11. User Preferences / Style Expectations

- Preserve RTL Hebrew UX and the current visual language.
- Preserve mobile responsiveness and avoid desktop-only admin layouts.
- Keep changes repository-consistent and minimal; avoid unrelated refactors.
- Prefer real persistence and real exports over mock or UI-only shortcuts.
- When asked for “latest” deployment/backend behavior, verify the actual current code/path instead of assuming.

## 12. Recurring Pitfalls

- Forgetting to redeploy Apps Script after adding new actions.
- Forgetting to update Google Sheets headers/tabs to match the repo.
- Reintroducing locale-dependent date formatting or AM/PM.
- Adding row-click editing without stopping event propagation on delete/action buttons.
- Exporting raw IDs instead of user-facing columns, or forgetting serial numbering.

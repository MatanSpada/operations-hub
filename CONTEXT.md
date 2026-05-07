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
- Equipment: equipment catalog plus a real issue/return ledger, including single-item issuance and an expanded signer-based assignment flow.
- Missions: Bahad 6 field tasks, now editable/searchable/deletable/exportable, with approving-commander support and mission-specific short-date display in the UI/export flow.
- Vehicles: active vehicle missions plus completed mission reporting/export.
- Workforce: reserve-duty oriented employee table with row-click editing.
- Qualifications: qualifications overview, including a mobile horizontal-scroll fix aligned with the shared table pattern.
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
- Current repo-side backend changes that definitely require redeploy if not already live:
  - Missions `ApprovingCommander`
  - Equipment `EmployeeID`
  - Equipment `syncEmployeeEquipmentAssignments`

## 5. Export / Report Behavior

- CSV export is handled in [src/utils.ts](/home/matan/Documents/operations-hub/src/utils.ts).
- All exports now add a serial-number column automatically as the first column.
- Central smart export lives in [src/modules/settings/SettingsPage.tsx](/home/matan/Documents/operations-hub/src/modules/settings/SettingsPage.tsx).
- “Export all tables” offers ZIP vs separate files.
- ZIP export is client-side and does not depend on Apps Script.
- Vehicles, Missions, and Workforce still keep local exports where useful, but smart export is centered in Data Management.
- Missions export now includes `ApprovingCommander` and uses the mission-specific `DD/MM/YY` short-date formatting where that flow expects it.

## 6. Mobile Responsiveness Expectations

- Preserve the existing mobile drawer/sidebar behavior from [src/pages/Index.tsx](/home/matan/Documents/operations-hub/src/pages/Index.tsx) and the layout components.
- Tables remain horizontally scrollable via the shared [src/components/shared/DataTable.tsx](/home/matan/Documents/operations-hub/src/components/shared/DataTable.tsx).
- Modals are bottom-sheet style on mobile and centered on larger screens via [src/components/shared/Modal.tsx](/home/matan/Documents/operations-hub/src/components/shared/Modal.tsx).
- New controls should stack cleanly on small screens and remain usable in RTL.
- Equipment signer-assignment controls were recently reworked multiple times specifically for mobile stacking; avoid moving search/metadata controls away from the active table without checking the mobile flow.

## 7. Date / Time Expectations

- Display dates as `DD/MM/YYYY`.
- Display time as 24-hour `HH:mm`.
- No AM/PM in operational UI.
- Shared helpers in [src/utils.ts](/home/matan/Documents/operations-hub/src/utils.ts) are the canonical place for date/time formatting.
- Some flows intentionally use a custom visible date shell over a native `input[type="date"]` to avoid browser US placeholders. The shared component is [src/components/shared/DateDisplayInput.tsx](/home/matan/Documents/operations-hub/src/components/shared/DateDisplayInput.tsx).
- Missions intentionally use short-year visible dates (`DD/MM/YY`) in their own flow.

## 8. Data Management Conventions

- Do not hardcode master data when it already exists as a managed sheet-backed entity.
- Employee edits/creation must persist through Apps Script, not local UI-only state.
- Use the existing design language: cards, simple bordered controls, RTL alignment, responsive stacking.
- Avoid inventing disconnected report-only data structures if the domain model already exists.
- When a user explicitly prefers free text over DB-backed selection, keep persistence real but do not force a managed-entity selector if the domain still supports plain text in the sheet schema.

## 9. Recent Changes Already Implemented

- Vehicles were shifted from generic trip timing to mission-oriented records.
- Managed driving licenses were added and used by vehicles instead of hardcoded values.
- Bahad 6 field tasks were moved out of Vehicles into a dedicated Missions tab.
- Vehicle close flow now uses end date/time with computed duration.
- Missions are now editable, searchable, deletable, and treatment summary is optional.
- Missions now include `ApprovingCommander` end-to-end:
  - frontend type
  - normalization
  - create/edit form
  - table display
  - export paths
  - Apps Script
  - `Camp_Tasks` sheet contract
- Missions date display was standardized so the visible missions flow no longer exposes the browser US date placeholder; the flow uses a custom visible date control.
- Missions ordering is now explicitly defined and corrected:
  - Default visible order is real mission date descending (newest date first).
  - The Missions table no longer relies on raw string comparison for dates.
  - `Camp_Tasks` dates are normalized to ISO before frontend sorting/export display.
  - Header sorting is intentionally available only for:
    - `תאריך`
    - `מחלקה`
    - `מפקד מאשר`
  - Department and approving-commander sorts fall back to the default mission-date order when values tie.
- Workforce rows are clickable/editable.
- Data Management employee creation supports qualification and driving-license assignment.
- Data Management now has centralized smart export.
- Employee driving-license assignments are stored in `Employee_Driving_Licenses`.
- Qualifications mobile table scrolling was fixed by aligning that screen with the same shared table-shell behavior used elsewhere and removing the mobile-sticky-column regression.
- Equipment flow has been expanded significantly:
  - `Equipment_Ledger` now supports optional `EmployeeID` in the repo contract.
  - Apps Script supports `syncEmployeeEquipmentAssignments` for signer-based quantity syncing against the real ledger.
  - Active equipment loans are updated when employee name/department changes.
  - Deleting an employee now checks active equipment loans by `EmployeeID` first, with legacy name fallback.
  - The lower equipment area now has two sections:
    - `פריטים מושאלים`
    - `החתמה לפי שם`
  - The signer-based flow evolved through multiple UX revisions and the current behavior matters:
    - Signer name is free text, not a forced DB selector.
    - The real ledger still stores `IssuedTo`; `EmployeeID` is attached only when the free-text signer exactly matches an employee.
    - The screen shows a list of all currently active signers; clicking a signer loads their active equipment.
    - The summary row now shows signer name and `פריטים משוייכים`, plus `זכה הכל` to return all currently assigned equipment for that signer through the real sync flow.
    - The signer workflow now splits into two sub-views:
      - `פריטים משוייכים`: currently assigned items only, with `שנה כמות` per row and a modal that allows `הוחזר` or entering a new quantity.
      - `הוסף פריטים`: the broader equipment catalog table for adding/changing quantities, using the existing draft/sync logic.
    - The expected return date uses the shared visible-date control and must not expose the browser US placeholder.
    - The item search input is intentionally placed close to the active item table, especially on mobile.
    - Warnings for inactive / reserve-ended / reserve-ending-soon linked employees must remain intact where a signer is matched to a known employee.

## 10. Equipment Domain Notes

- Catalog stock lives in `Equipment_Catalog.TotalQuantity`.
- Active issuance state lives in `Equipment_Ledger`; available quantity is always derived from catalog total minus active issued quantities.
- The single-item flow (`נפק פריט`) still exists and must keep working.
- The signer-based flow is not a fake client-only shortcut. It must continue to sync against the same ledger model, stock math, and borrowed-items table.
- Partial returns are supported in Apps Script by reducing the active row quantity and appending a returned row for the returned portion.
- The signer-based flow intentionally supports both:
  - free-text signers with no employee match
  - exact employee matches that enrich the ledger with `EmployeeID` and power warnings / employee-sync behaviors
- When changing this area, always inspect:
  - [src/modules/equipment/EquipmentPage.tsx](/home/matan/Documents/operations-hub/src/modules/equipment/EquipmentPage.tsx)
  - [src/api.ts](/home/matan/Documents/operations-hub/src/api.ts)
  - [src/apps-script/Code.gs](/home/matan/Documents/operations-hub/src/apps-script/Code.gs)
  - [src/data/normalize.ts](/home/matan/Documents/operations-hub/src/data/normalize.ts)
  - [src/types.ts](/home/matan/Documents/operations-hub/src/types.ts)

## 11. Manual Steps Often Required After Backend Changes

- Update Google Sheet headers/tabs if the repo added/changed schema.
- Paste the latest [src/apps-script/Code.gs](/home/matan/Documents/operations-hub/src/apps-script/Code.gs) into Apps Script.
- Redeploy the Apps Script Web App.
- Ensure local/production `VITE_GAS_URL` points to that latest deployment.
- Current known manual schema expectations:
  - `Camp_Tasks` should include `ApprovingCommander` between `RequesterName` and `Mission`.
  - `Equipment_Ledger` should include `EmployeeID` after `IssuedTo`.

## 12. User Preferences / Style Expectations

- Preserve RTL Hebrew UX and the current visual language.
- Preserve mobile responsiveness and avoid desktop-only admin layouts.
- Keep changes repository-consistent and minimal; avoid unrelated refactors.
- Prefer real persistence and real exports over mock or UI-only shortcuts.
- When asked for “latest” deployment/backend behavior, verify the actual current code/path instead of assuming.
- The user often iterates on UX details in the Equipment signer flow. Preserve backend correctness first, but be ready to change the interaction model while keeping the same underlying ledger behavior.
- The user is sensitive to browser-default US date presentation and expects visible Israeli-style dates in corrected flows.

## 13. Recurring Pitfalls

- Forgetting to redeploy Apps Script after adding new actions.
- Forgetting to update Google Sheets headers/tabs to match the repo.
- Reintroducing locale-dependent date formatting or AM/PM.
- Sorting mission dates by rendered `DD/MM/YY` strings or by raw mixed sheet strings instead of normalized real date values.
- Adding row-click editing without stopping event propagation on delete/action buttons.
- Exporting raw IDs instead of user-facing columns, or forgetting serial numbering.
- Accidentally turning the Equipment signer flow back into a strict DB-backed employee picker after the user explicitly asked for free-text signer names.
- Breaking the shared stock math by bypassing `syncEmployeeEquipmentAssignments` or by editing active loan quantities only in the UI.
- Reintroducing browser-visible `mm/dd/yyyy` placeholders in flows that were already corrected with a visible date shell.

## 14. Missions Ordering Notes

- The historical Missions ordering bug came from two layers together:
  - Apps Script could return `Camp_Tasks.Date` as a raw sheet/JS date string when the sheet cell was a date object.
  - The Missions page sorted `task.date` with plain string comparison (`localeCompare`) instead of comparing normalized date values.
- Current expected behavior:
  - No explicit header sort: mission date descending by real date value.
  - Clicking `תאריך`: toggles real-date descending/ascending.
  - Clicking `מחלקה`: alphabetical sort (`he`, stable fallback to default mission-date order).
  - Clicking `מפקד מאשר`: alphabetical sort (`he`, empty values last, stable fallback to default mission-date order).
- Relevant files for this behavior:
  - [src/modules/missions/MissionsPage.tsx](/home/matan/Documents/operations-hub/src/modules/missions/MissionsPage.tsx)
  - [src/components/shared/DataTable.tsx](/home/matan/Documents/operations-hub/src/components/shared/DataTable.tsx)
  - [src/data/normalize.ts](/home/matan/Documents/operations-hub/src/data/normalize.ts)
  - [src/utils.ts](/home/matan/Documents/operations-hub/src/utils.ts)
  - [src/apps-script/Code.gs](/home/matan/Documents/operations-hub/src/apps-script/Code.gs)

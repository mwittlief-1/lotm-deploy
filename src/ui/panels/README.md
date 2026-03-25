# UI Panels

This directory is the extraction target for panel-level UI components currently concentrated in `src/App.tsx`.

Initial targets:
- `TurnReportPanel`
- `HouseholdPanel`
- `RelationshipsDrawer`
- `ConsumptionAuditPanel`
- `LocalsStatusPanel`

Rule: panels consume view data and callbacks; they do not mutate simulation state directly.


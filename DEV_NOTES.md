# Dev Agent A — v0.2.3 Patch Notes (UI/Clarity)

## Scope
- Implemented **Prospects** Turn Report section (Workstream A-1) per `docs/ux/v0.2.3_copy.md`, `docs/ux/v0.2.3_info_hierarchy.md`, and `docs/ux/v0.2.3_clarity_acceptance.md`.
- No new screens/routes.
- No sim changes.

## What changed
### Turn Report
- Added a **Prospects** section (always present; shows empty states when no prospects).
- Supports **shown vs hidden** relevance filtering:
  - Renders `shown_ids` (stable order) and displays counts with the neutral “hidden” explanation.
  - Adds a **Prospects log** `<details>` block with shown/hidden counts and any prospect-related notes found in run log `report.notes`.

### Prospect cards
- Renders type label, parties line, optional subject (marriage), summary, requirements, costs, expected effects, confidence, and expiry.
- Adds **Accept** / **Reject** actions:
  - Records decisions in `decisions.prospects.actions[]` as `{ prospect_id, action }`.
  - Uses confirmation dialogs for accept (when costs exist) and for reject.
  - Shows immediate toast acknowledgement or error messages using binding copy.

## Data assumptions / compatibility
- UI looks for a `prospects_window_v1` payload at:
  - `ctx.prospects_window`, `ctx.prospectsWindow`, `ctx.report.prospects_window`, or `ctx.report.prospectsWindow`.
- Safe when absent: section falls back to empty state.
- Prospects decision schema introduced UI-side:
  - `decisions.prospects = { kind: "prospects", actions: Array<{ prospect_id, action: "accept"|"reject" }> }`
  - Sim can ignore or adopt this shape.

## Files changed
- `src/App.tsx`
- `DEV_NOTES.md`

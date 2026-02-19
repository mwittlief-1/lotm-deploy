# Dev Agent A — v0.2.4 UI patch notes

## Scope (UI-only)
Changes implement the v0.2.4 Dev A UI tasks against the latest v0.2.3.x certified baseline.

**No sim / content / tooling changes.**  
All updates are contained to `src/App.tsx` plus this notes file.

## What changed

### 1) Turn Summary top block
- Added a lightweight top-of-screen summary block on the Play screen with headings:
  - **“Last 3 years”**
  - **“Now choose”**
- Shows quick deltas (Population / Bushels / Coin / Unrest, and Shortage if present).

### 2) Consumption split (Peasant vs Court) in Turn Report
- Updated Food Balance → Consumption line to support the v0.2.4 TurnReport fields:
  - `peasant_consumption_bushels`
  - `court_consumption_bushels`
  - `total_consumption_bushels`
- When present, the UI renders:
  - **Peasant Consumption (3y)**
  - **Court Consumption (3y)**
  - Plus the reconciliation copy:
    - “Your court eats from the same stores as the manor.”
    - “Both draw from the same Food Stores. Totals reconcile in Food Balance.”
- Legacy fallback: if split fields are missing, the UI continues to use `consumption_bushels`.

### 3) Household/Court roster + Court Size
- Household details panel now renders a **court roster** (deduped by `person.id` before render) that includes:
  - Head / spouse / children
  - Court officers (from `houses[player_house_id].court_officers`) with role titles:
    - Steward / Clerk / Marshal
  - Court “extra” members (from `houses[player_house_id].court_extra_ids`) such as married-in spouses
- Each roster row shows:
  - Status badges (Heir / Married / Widow/Widower/Widowed / Deceased)
  - A relationship label (Son / Daughter / Spouse / Officer; or Kin fallback)
  - Officer role shown as “Officer — Steward/Clerk/Marshal” where applicable
- Added **Court Size** metric (alive unique count) with tooltip from v0.2.4 UX copy.

### 4) Marriage accept confirmation toast (copy templates)
- On accepting a **Marriage** prospect, toast now uses v0.2.4 explicit copy:
  - “Marriage arranged. {child_name} is now married.”
  - If spouse name is available, adds:
    - “{spouse_name} joins your court. Court size increased.”
- Toast container now uses `whiteSpace: "pre-line"` to render multi-line messages cleanly.

## Compatibility / safety
- Court roster derivation is **tolerant to missing fields** (no crash if `court_officers` / `court_extra_ids` are absent).
- No conditional hook execution was introduced; the component still follows the **single-return** pattern.

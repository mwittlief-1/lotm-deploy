# Dev Agent A — v0.2.3.2 UI Polish Patch

## Scope
UI/Clarity only (Workstream C + v0.2.3.2 P1 UI items). **No sim/tooling changes. No new screens/routes.**

## Changes
All changes are in `src/App.tsx`.

### Prospects (clarity)
- Added **type-specific** accept confirmations and accept/reject acknowledgements per UX addendum:
  - Marriage: “Accept marriage proposal?” / “Marriage accepted.” / “Marriage offer declined.”
  - Grant: “Accept grant offer?” / “Grant accepted.” / “Grant offer declined.”
  - Inheritance claim: “Accept inheritance claim?” / “Claim recorded.” / “Claim declined.”
- When a prospect is acted on during the current turn, the card now shows a decided-state badge (**Accepted/Rejected**) and the hint **“Decision recorded.”**
- Household details list now shows a **Marriage** badge for people marked `married` (so the effect of accepting a marriage prospect is visible).

### Legacy marriage window
- The old **Marriage Window** section is hidden when any Prospects are present for the turn (prevents dual systems on the same turn).

### Obligations placement
- Moved the payment inputs (**Pay coin / Pay bushels / War levy**) into a dedicated **Obligations** block and placed them adjacent to the due/arrears timing breakdown.

### End Turn feedback
- Clicking **Advance Turn** now shows a toast: **“Turn X resolved.”** and scrolls the page to the top.

### Unrest breakdown
- Added a collapsible **“Unrest change this turn”** breakdown. If structured breakdown data exists, it renders **Increased by / Decreased by** contributors; otherwise it shows **“No breakdown available.”**

### Construction selector
- Disabled already-built improvements in the construction selector (prevents selecting completed improvements).

## Hooks safety
- Kept the v0.2.3.1 hook-order hotfix pattern intact: **all hooks run unconditionally** and the component returns once at the end.


# Court Budget Audit v0.3.0

Last updated: 2026-03-25
Task: `V03-R0-003-T01`

## Scope

This audit covers the engine-core surfaces allowed for `V03-R0-003-T01`:

- `src/sim/domains/court/**`
- `src/ui/**`
- `tests/**`
- `docs/qa/**`

The goal is to identify which current court-facing actions should consume the planned court decision budget, and where that budget state will need to appear once the registry is introduced.

## Current court decision surfaces

| Surface | Current behavior | Budget signal today | Gap for v0.3 court pacing |
| --- | --- | --- | --- |
| `src/sim/domains/court/energy.ts` | Court domain currently exposes only energy max/available spend helpers. | No decision-budget registry, action catalog, or spent-category tracking exists. | `T02` needs a dedicated court-budget state object in this domain; energy is not a substitute for decision budget. |
| `src/ui/panels/DecisionsPanel.tsx` marriage window | Shows inbound marriage offers, dowry coin delta, and `accept` / `reject_all` / `scout` / `clear` actions. Offer accept is disabled only when coin is insufficient for a negative dowry. | Coin affordability is visible; no court-budget cost, remaining decisions, or spend forecast is shown. | Budget costs for inbound processing vs outbound scouting need to surface here once `T04` lands. |
| `src/ui/panels/ProspectsPanel.tsx` | Renders prospect cards for `marriage`, `grant`, and `inheritance_claim`, plus generic requirements, costs, and predicted effects. | Uses `costs` and `predicted_effects`, but nothing in the card distinguishes court-budget spend from coin/energy/bushel spend. | Budget-consuming prospect actions need explicit budget cost and remaining-budget visibility here or in a sibling summary. |
| `src/ui/panels/PlayScreen.tsx` | Accept flow confirms prospect effects, checks resources, records decisions, and renders `prospects_log` receipt lines. | Marriage acceptance can already surface coin deltas and receipt text, but not court-budget deltas. | Accepted court actions need a deterministic budget charge and a receipt/log surface for that charge. |
| `src/ui/panels/TurnReportPanel.tsx` | Reports bushels, coin, unrest, court roster, and court consumption. | No court-budget summary appears in the report. | `T05` and `T06` need a stable report field for remaining budget, spent total, and spent-by-action summary. |
| `src/ui/panels/DiffLedgerPanel.tsx` and `src/ui/playScreenModel.ts` | Shows top diff items from report ledger data or derived deltas. | No court-budget ledger line or source tag exists today. | Once budget is exposed in phase outputs, the ledger is a natural place to surface high-impact budget spend. |
| `tests/v024_dev_b_court.test.ts` and marriage/prospect tests | Coverage exists for court roster changes, marriage acceptance, grant predicted effects, prospect ordering, and receipt lines. | No tests assert court-budget state, decrement rules, or exhaustion behavior. | `T02` through `T06` need new deterministic tests for registry state, charges, and UI rendering. |

## Budget-consuming action inventory

### Active surfaces that should consume court decision budget

1. `marriage` prospect acceptance or processing
   - Surface: `src/ui/panels/ProspectsPanel.tsx`
   - Supporting flow: `src/ui/panels/PlayScreen.tsx`
   - Existing signal: coin effects can already appear through `predicted_effects.coin_delta` and accepted receipt lines.
   - Budget relevance: this is a court-facing choice that consumes attention even when the dowry is neutral or favorable.

2. outbound marriage scouting
   - Surface: `src/ui/panels/DecisionsPanel.tsx`
   - Existing signal: a `scout` action exists in the marriage window, but no budget metadata or receipt exists.
   - Budget relevance: backlog `V03-R0-003-T04` already defines this as more expensive than inbound acceptance/processing.

### Court-budget consumers not present yet in active implementation surfaces

These actions are named in the epic scope but do not currently appear in the allowed implementation surfaces:

- liege gifts
- church offerings

Search notes:

- No active gift/offering implementation surface was found under `src/sim/domains/court/**`, `src/ui/**`, or `tests/**`.
- The only nearby hit was legacy `village_feast`, which is a construction/improvement artifact rather than a court-budget action.

This means `V03-R0-003-T03` will be introducing first-class budget charges for gifts and offerings rather than retrofitting an already-visible UI flow.

### Court-adjacent actions that share the same UI pipeline but are not budget spenders by this task

- `grant` prospects
  - Current behavior in `tests/v0234_dev_b_patch.test.ts` shows coin gain plus relationship effects.
  - This is a shared `prospects` UI surface, but it is not a named court-budget consumer in the court-pacing epic.

- `inheritance_claim` prospects
  - Current UI has accept/reject handling in the same generic prospect flow.
  - No current budget cost is surfaced or implied in the scope lock for this epic.

## Where budget state must surface next

### Required simulation/report outputs

The first budget registry should become visible in deterministic outputs that the UI and tests already read:

- turn context or report fields consumed by `PlayScreen` and `TurnReportPanel`
- `prospects_log` accepted events, so budget-consuming court actions can emit budget receipt lines beside coin effects
- diff-ledger/report surfaces, so large court-budget spends can be explained alongside other top turn deltas

At minimum, the next tasks need a stable surface for:

- remaining court decision budget
- total spent this turn
- spent-by-action-category summary
- per-action budget charge written into receipts/log events when a court action is accepted

### Required UI surfaces

Once the report fields exist, budget state should surface in the following UI locations:

- `src/ui/panels/DecisionsPanel.tsx`
  - remaining budget before the player commits new court actions
  - explicit budget cost for marriage scouting vs inbound marriage handling

- `src/ui/panels/ProspectsPanel.tsx`
  - budget cost on marriage prospect cards
  - exhaustion/disabled state when no court budget remains

- `src/ui/panels/TurnReportPanel.tsx`
  - summary of remaining/spent court budget for the proposed turn

- `src/ui/panels/DiffLedgerPanel.tsx`
  - optional high-impact explanation line when budget consumption materially shaped the turn

## Test gaps to close

The current suite has the right entry points but no budget assertions. The follow-on tasks should add:

1. court-domain tests for registry initialization, deterministic decrement, clamp behavior, and per-turn reset cadence
2. action tests for gift/offering charges and marriage scouting vs inbound acceptance costs
3. report/receipt assertions that budget spend is written in deterministic order
4. UI tests that remaining budget and exhausted-action states render correctly once the report fields exist

## Handoff into follow-on tasks

- `T02` should add the decision-budget registry in `src/sim/domains/court/**`; nothing budget-related exists there today beyond generic court energy.
- `T03` must introduce first-class gift/offering budget charges because those action surfaces are currently absent from the active engine-core paths.
- `T04` should treat outbound marriage scouting as a distinct action class from inbound marriage prospect acceptance.
- `T05` will need to expose the registry through deterministic phase outputs before UI work can begin.
- `T06` should wire those new outputs into `DecisionsPanel`, `ProspectsPanel`, and `TurnReportPanel`; the current UI has no remaining-budget surface.

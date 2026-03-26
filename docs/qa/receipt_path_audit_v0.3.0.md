# Receipt Path Audit v0.3.0

Last updated: 2026-03-26
Task: `V03-R0-001-T01`

## Scope

This audit covers the tooling/qa lane scope for `V03-R0-001-T01`:

- `src/sim/domains/economy/**`
- `src/sim/domains/experience/**`
- `tests/**`
- `docs/qa/**`

The goal is to enumerate every active `coin`, `food_stores`, and `meat_stores` mutation path, then label whether the path already routes through canonical ledger ownership and canonical receipt ownership.

## Canonical interpretation used in this audit

- The fiscal packet names the tracked assets as `coin`, `food_stores`, and `meat_stores`.
- On the current runtime branch, `food_stores` still maps to `state.manor.bushels_stored`.
- `meat_stores` does not exist anywhere under active runtime `src/` code on this branch.
- Canonical ledger ownership today is `src/sim/domains/economy/ledger.ts`.
- Canonical receipt ownership does not exist yet. `src/sim/phases/phaseResult.ts` and `src/sim/turn.ts` only emit string-based phase summary and note receipts, not ordered fiscal receipt rows with asset/category/counterparty ownership.

## Active mutation inventory

| Flow | Current writer path | Asset field(s) touched today | Ledger ownership | Receipt ownership | Follow-on routing surface |
| --- | --- | --- | --- | --- | --- |
| State normalization clamp | `src/sim/normalize.ts` -> `setBushelBalance`, `setCoinBalance`, `setArrearsCoin`, `setArrearsBushels` | `coin`, `food_stores` alias, arrears fields | Canonical | Not applicable for fiscal receipt ownership; this is state sanitation rather than an economic delta | Keep excluded from receipt emission; no routing change needed beyond preserving ledger use |
| Spoilage, crop production, and shortage drain | `src/sim/phases/phase_consumption.ts` -> `setBushelBalance`, `applyBushelDelta`, `spendBushels` | `food_stores` alias | Canonical | Non-canonical; `src/sim/turn.ts` only emits aggregated consumption-phase summary and note lines | `V03-R0-001-T02` for receipt schema, then `V03-R0-001-T04` for store receipt writers |
| Grain sale | `src/sim/phases/phase_consumption.ts` -> `spendBushels` and `applyCoinDelta` | `food_stores` alias and `coin` | Canonical | Non-canonical; sell receipts are request/prose notes rather than ordered dual-asset rows | `V03-R0-001-T02`, `V03-R0-001-T03`, `V03-R0-001-T04` |
| Construction start cost | `src/sim/phases/phase_consumption.ts` -> `spendCoin` | `coin` | Canonical | Non-canonical; construction receipts only describe the action in note text | `V03-R0-001-T02`, `V03-R0-001-T03` |
| Obligations settlement and war-levy coin fallback | `src/sim/phases/phase_obligations.ts` -> `spendCoin`, `spendBushels`, `spendArrearsCoin`, `spendArrearsBushels`, `spendTaxDueCoin`, `spendTitheDueBushels` | `coin` and `food_stores` alias | Canonical | Non-canonical; obligation receipts are requested totals plus prose notes, not asset-owned rows | `V03-R0-001-T02`, `V03-R0-001-T03`, `V03-R0-001-T04` |
| Marriage scouting and dowry settlement | `src/sim/domains/people/marriage.ts` -> `spendCoin`, `applyCoinDelta` | `coin` | Canonical | Non-canonical; marriage resolution uses note text only | `V03-R0-001-T02`, `V03-R0-001-T03` |
| Prospect acceptance coin deltas | `src/sim/phases/phase_prospects.ts` -> `applyCoinDelta` | `coin` | Canonical | Non-canonical; the only nearby receipt surface is ad hoc `effects_applied.receipt_line` text for relationship effects, not a canonical fiscal receipt row | `V03-R0-001-T02`, `V03-R0-001-T03` |
| Content event deck coin and store deltas | `src/content/events.ts` -> `addBushels` / `addCoin` wrappers over `applyBushelDelta` / `applyCoinDelta` | `food_stores` alias and `coin` | Canonical | Non-canonical; the events phase receipt only reports event count while economic deltas live in event text/logs | `V03-R0-001-T02`, `V03-R0-001-T03`, `V03-R0-001-T04` |
| Experience reporting | `src/sim/domains/experience/reporting.ts` | none; read-only diff/reporting | No mutation path here | Read-only | `V03-R0-001-T05` should assert deterministic receipt/report projections once receipt rows exist |
| Meat stores | no active runtime writer under `src/` | `meat_stores` | Missing runtime surface | Missing runtime surface | Coordinate with already-tracked fiscal baseline work under `V03-R0-006`; there is no active writer to reroute on this branch |

## Findings

1. Active runtime `coin` and `food_stores` mutations are already centralized through `src/sim/domains/economy/ledger.ts`. Repo search found no active direct writes to `state.manor.coin` or `state.manor.bushels_stored` outside the ledger module.
2. Receipt ownership is still non-canonical for every economically meaningful path above. The current `PhaseReceiptV0` shape is a string list owned by phases, not ordered fiscal receipt rows owned by the mutators.
3. `src/sim/domains/experience/**` does not currently mutate `coin`, `food_stores`, or `meat_stores`. It only derives aggregate top-driver text from before/after snapshots.
4. `food_stores` is still a naming alias over `bushels_stored`, and `meat_stores` is absent from runtime state, normalization, reporting, and tests. The current branch can audit store routing for food/grain today, but there is no active meat-store writer to classify beyond “missing.”
5. `tests/sim/ledger_domain.test.ts` already covers clamped ledger ownership semantics for coin, bushels, and arrears. There is no deterministic test coverage yet for receipt field presence, receipt ordering, or per-delta serialization.

## Handoff into follow-on tasks

- `V03-R0-001-T02` should define one stable receipt schema and ordering contract that every mutation path in the table can target.
- `V03-R0-001-T03` should wrap the coin-bearing flows above in canonical receipt writers without changing the underlying ledger math.
- `V03-R0-001-T04` should do the same for current food-store paths and record `meat_stores` as blocked on the fiscal baseline introducing an actual runtime surface.
- `V03-R0-001-T05` should snapshot representative sell, obligation, marriage/prospect, event, and consumption receipts after the schema and writer routing are in place.

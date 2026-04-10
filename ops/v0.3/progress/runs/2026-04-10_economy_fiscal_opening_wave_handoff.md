# Run Log

**Run ID:** 2026-04-10-economy-fiscal-opening-wave
**Task IDs:** R5-006-T01, R5-006-T02, R5-002-T02, R5-008-T01
**Date:** 2026-04-10
**Branch:** codex/v0.3-lane-economy-fiscal
**Base Merge:** 4510982 (`merge: refresh economy fiscal lane from v0.3.5 prep`)
**Commit:** uncommitted

## Gates
- focused_vitest:
  - `tests/sim/economy_maintenance.test.ts`
  - `tests/sim/obligations_view.test.ts`
  - `tests/sim/bounded_snapshot_contract.test.ts`
  - `tests/logSnapshotsBounded.test.ts`
  - PASS
- qa: NOT RUN
- preflight: NOT RUN
- seed_replay_batch_twice: NOT RUN
- repo_duplicates: NOT RUN

## Changed Files
- `src/sim/domains/economy/maintenance.ts`
- `src/sim/domains/economy/obligationTangibleBite.ts`
- `src/sim/domains/experience/obligationsView.ts`
- `src/sim/domains/experience/reporting.ts`
- `src/sim/types.ts`
- `tests/sim/economy_maintenance.test.ts`
- `tests/sim/obligations_view.test.ts`
- `tests/sim/bounded_snapshot_contract.test.ts`
- `tests/logSnapshotsBounded.test.ts`

## Notes
- Added `maintenance_registry_v1` in `src/sim/domains/economy/maintenance.ts` with deterministic building, franchise-right, and service-right rows keyed by manor, explicit receipt taxonomy references, active-project context, and per-entry `labor_required` so maintenance pressure is auditable before engine-core consumes it.
- Added `applyEconomyMaintenanceCoinCosts(...)` as the lane-owned canonical write path for recurring upkeep coin spend. It only mutates coin through the ledger API and returns per-entry requested/paid/shortfall data plus emitted receipt snapshots.
- Surfaced `economy_maintenance_view_v1` through bounded snapshots in `src/sim/domains/experience/reporting.ts`; the view exposes manor-keyed building/right summaries plus totals for coin and labor without wiring new turn orchestration.
- Extended `economy_obligations_view_v1` with typed `receipt_group_order`, per-counterparty `receipt_groups`, `next_stage_trigger`, `terminal_risk`, and `tangible_bite_preview` fields. The view now makes payment, arrears-carry or penalty trail, and seizure or forced-payment receipts explicit instead of leaving UI to infer them from prose.
- Added stage-two preview metadata in `src/sim/domains/economy/obligationTangibleBite.ts`, including the current placeholder tuning-cap hooks, so UI can show bite previews before the full stage-two runtime is promoted.

## Engine Handoff
- `buildEconomyMaintenanceRegistry(state)` is the intended read seam for R5-006-T03. Consume `manor_rows_by_key[manor_key].entries_by_id[*].labor_required` or the row `totals.labor_required` before allocatable labor is spent.
- Do not route labor drag through UI or direct manor mutation. The economy lane only shipped the auditable requirement seam plus coin upkeep application; engine-core still owns where in phase order labor drag is actually consumed.

## UI Handoff
- `boundedSnapshot(state)` now includes `economy_maintenance_view`, so manor/detail surfaces can render maintenance buildings, rights, active project, and total labor pressure without reading raw world assignments or improvement tables.
- `economy_obligations_view.counterparty_summaries[*]` now carries:
  - `receipt_groups` for payment, penalty, and seizure breakdowns
  - `next_stage_trigger` for stage escalation copy
  - `terminal_risk` for dispossession-threshold transparency
  - `tangible_bite_preview` for stage-two forced-collection previews
- Existing UI consumers that only read the prior fields remain compatible; the new fields are additive.

## Verification Notes
- Focused vitest coverage passed on the new maintenance seam, bounded snapshot exposure, obligations receipt grouping, and bounded log snapshot contract.
- `npx tsc --noEmit` still fails repo-wide because of existing unrelated script and domain typing backlog; rerunning it after this lane no longer surfaces the touched maintenance or obligations files in the filtered error stream.

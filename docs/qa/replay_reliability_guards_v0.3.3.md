# Replay Reliability Guards v0.3.3

Last updated: 2026-04-05  
Task: `V03-R3-001-T03`

## Scope

Record the replay-hash and guard additions that enforce bounded snapshot budgets and turn-time soft ceilings for the v0.3.3 replay harness.

## Replay hash additions

`scripts/seedReplay.ts` now records:

- `snapshot_budget_bytes_per_turn` in the batch summary (sourced from `ops/v0.3/runtime-contract.yaml`)
- `snapshot_max_bytes` per run entry

These values are deterministic and therefore participate in the replay summary hash. Any bounded snapshot expansion that breaches the v0.3 snapshot budget will change the replay hash and fail the run.

## Snapshot budget guard

During seed replay, each turn’s `snapshot_after` bounded snapshot is serialized via the stable hash serializer. If the byte size exceeds the configured cap (`snapshot_cap_bytes_per_turn`), the replay run throws with a detailed error message. The v0.3.3 cap is currently set to `524288` bytes in `ops/v0.3/runtime-contract.yaml` to accommodate the expanded bounded snapshot surfaces.

## Turn-time soft ceiling

The replay harness measures per-turn execution time (propose + decide + apply) and emits a warning when a turn exceeds `turn_time_soft_ceiling_ms_per_seed`. This is a soft guard only; warnings do not change replay hashes.

## Notes

- The soft time ceiling is informative only; sustained overages should be investigated before accepting new replay baselines.
- The snapshot cap guard is hard and blocks acceptance if exceeded.

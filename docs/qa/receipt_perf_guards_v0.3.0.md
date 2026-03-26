# Receipt Perf Guards v0.3.0

Last updated: 2026-03-26
Task: `V03-R0-001-T06`

## Scope

This task adds lightweight regression and perf guards for receipt-heavy flows in the tooling/qa lane.

- Regression surface: `tests/sim/fiscal_receipt_perf_guards.test.ts`
- Runtime budget source: `ops/v0.3/runtime-contract.yaml`
- Receipt writer surface under guard: `src/sim/domains/economy/ledger.ts`

## Budget anchors

The guard reads these values directly from `ops/v0.3/runtime-contract.yaml`:

- `snapshot_cap_bytes_per_turn`: `204800`
- `turn_time_soft_ceiling_ms_per_seed`: `250`

## Seeded heavy-flow scenario

- Seed: `V03_R0_001_T06_HEAVY_FLOW`
- Turn index under test: `11`
- Loop count: `32`
- Expected receipt rows: `134`

The scenario intentionally mixes the receipt-heavy writer paths that matter for `v0.3.0`:

- event coin deltas
- household food-store spends
- liege tax assessments and payment
- church tithe assessments and payment
- tax-to-arrears carry
- tithe-to-arrears carry

## Guard behavior

The test protects three things:

1. Deterministic replay of the same seeded heavy-flow receipt output.
2. Explicit row-growth limits via exact total row count and per-asset row counts.
3. Lightweight perf limits via serialized snapshot byte size and elapsed generation-plus-snapshot time.

## How to read failures

### Determinism failure

If the seeded heavy-flow serialization changes between two runs with the same seed, treat it as a receipt ordering or writer regression first.

Check:

- `receipt_id` ordering
- phase / phase-sequence sorting
- accidental duplicate writes
- any new asset surface entering the receipt journal

### Row-count or asset-count failure

If the total row count or per-asset counts drift, assume the writer topology changed.

Check:

- loops or call sites that now emit more than one receipt for a single delta
- carry flows that now emit extra debit/credit rows
- clamping behavior that suppresses rows unexpectedly

### Snapshot-cap failure

If serialized bytes exceed `snapshot_cap_bytes_per_turn`, treat it as a bounded-snapshot regression.

Check:

- repeated summary text growth
- new verbose counterparty labels or duplicated actor ids
- new fields being added to receipt rows without contract review

### Soft-time failure

If elapsed time exceeds `turn_time_soft_ceiling_ms_per_seed`, treat it as a hotspot warning rather than a golden-contract issue.

Check:

- repeated sorting or serialization work in `readLedgerReceiptSnapshots`
- extra receipt volume from duplicate writes
- newly expensive string generation or cloning in the ledger / receipt path

If the failure is near the threshold, rerun the targeted test locally once to rule out transient machine noise. If it remains reproducible, it should be treated as a real regression for this lane.

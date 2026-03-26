# Receipt Snapshot Fixtures v0.3.0

Last updated: 2026-03-26
Task: `V03-R0-001-T05`

## Scope

This task adds bounded, deterministic receipt snapshot fixtures for the tooling/qa lane without editing integrator-owned orchestration.

- Canonical writer surface: `src/sim/domains/economy/ledger.ts`
- Canonical snapshot contract: `src/sim/domains/economy/receipts.ts`
- Fixture verification: `tests/sim/fiscal_receipt_snapshot_fixtures.test.ts`

## Fixture inventory

### `tests/fixtures/fiscal_receipt_snapshot_economy_v0.3.0.json`

- Seed: `V03_R0_001_T05_ECONOMY_FIXTURE`
- Rows: 6
- Covers:
  - event coin income
  - consumption food-store drain
  - sell-phase food-store debit and coin credit
  - marriage dowry coin spend
  - prospects grant coin income

### `tests/fixtures/fiscal_receipt_snapshot_obligations_v0.3.0.json`

- Seed: `V03_R0_001_T05_OBLIGATIONS_FIXTURE`
- Rows: 8
- Covers:
  - liege-tax assess and partial payment
  - church tithe assess and partial payment
  - tax carry from due into arrears
  - tithe carry from due into arrears

## Boundedness rules

- Fixtures store only ordered `fiscal_receipt_v1` snapshot rows.
- Fixtures do not embed `RunState`, turn logs, replay artifacts, or nested snapshots.
- Each fixture remains intentionally small enough for line-by-line review in diffs.
- Test coverage asserts both row counts and canonical field order so future fixture growth is explicit.

## Review guidance

- Treat fixture diffs as contract changes, not incidental snapshots.
- Review receipt order, `receipt_id`, `asset`, `delta`, `balance_after`, and seeded actor/counterparty identity drift together.
- Refresh the fixtures only when ledger receipt routing or the receipt schema changes intentionally.

## Notes

- `src/sim/domains/experience/**` remains read-only for these flows on this branch, so this task snapshots canonical receipt rows directly rather than inventing a parallel reporting surface.
- The fixtures use fixed seeds to ensure repeated reconstruction yields byte-identical snapshots before the full replay gates run.

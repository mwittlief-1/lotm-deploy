# Receipts v1 Contract

Last updated: 2026-03-26
Task: `V03-R0-001-T07`

## Scope

This document closes the `V03-R0-001` receipts-hardening epic for the tooling/qa lane by consolidating the canonical receipt contract, the accepted QA evidence, and the remaining boundary notes.

The lane-owned scope closed by this epic is:

- `src/sim/domains/economy/**`
- `src/sim/domains/experience/**`
- `tests/**`
- `docs/qa/**`

The integrator-owned boundary remains unchanged:

- `src/sim/turn.ts`
- `src/sim/phases/**`

## Canonical surfaces

- Canonical receipt writer: `src/sim/domains/economy/ledger.ts`
- Canonical receipt schema and snapshot ordering: `src/sim/domains/economy/receipts.ts`
- Canonical QA audit: `docs/qa/receipt_path_audit_v0.3.0.md`
- Canonical schema note: `docs/qa/receipt_schema_contract_v0.3.0.md`
- Canonical seeded snapshot note: `docs/qa/receipt_snapshot_fixtures_v0.3.0.md`
- Canonical perf / regression note: `docs/qa/receipt_perf_guards_v0.3.0.md`

## Contract summary

### Assets

The canonical receipt asset set for `v0.3.0` is:

- `coin`
- `food_stores`
- `meat_stores`
- `tax_due_coin`
- `tithe_due_bushels`
- `arrears_coin`
- `arrears_bushels`

Runtime interpretation on this branch:

- `food_stores` aliases `state.manor.bushels_stored`
- `meat_stores` remains part of the schema contract, but there is still no active runtime writer under the scoped `src/` surfaces on this branch

### Snapshot determinism

Receipt snapshots are deterministic because the contract now locks:

- canonical field order
- canonical sort tuple
- lexicographic `related_actor_ids`
- integer truncation on numeric receipt fields
- ledger-owned `receipt_id` generation

### Writer semantics

The lane-owned writer contract is now:

- economic receipt rows are emitted from ledger-owned APIs, not from direct coin / stores mutation paths
- zero-delta writes do not emit rows
- missing receipt metadata preserves the legacy no-receipt behavior
- tax and tithe carry flows emit explicit debit and credit rows so arrears movement stays auditable

## Accepted QA evidence

### T01 audit

`docs/qa/receipt_path_audit_v0.3.0.md` records the initial mutation inventory and confirms that active scoped economy writes were already centralized through the ledger domain.

### T02 schema lock

`docs/qa/receipt_schema_contract_v0.3.0.md` locks:

- field order
- sort tuple
- asset names
- schema version

### T03 and T04 writer coverage

`tests/sim/ledger_domain.test.ts` covers:

- canonical coin receipt rows
- canonical food-store and obligation-bushel receipt rows
- tax and tithe carry into arrears
- legacy no-metadata semantics

### T05 seeded fixtures

`docs/qa/receipt_snapshot_fixtures_v0.3.0.md` and the fixture-backed test coverage lock representative seeded receipt snapshots for:

- event coin income
- consumption food-store drain
- sell dual-asset rows
- marriage and prospects coin flows
- liege tax and church tithe assess / pay / carry flows

### T06 perf guards

`docs/qa/receipt_perf_guards_v0.3.0.md` and `tests/sim/fiscal_receipt_perf_guards.test.ts` lock a seeded heavy-flow guard for:

- deterministic heavy receipt output
- explicit row-growth limits
- snapshot byte-size budget
- soft-time budget

## Accepted diff notes

- Tasks `T03`, `T04`, and `T05` were allowed to change receipt-facing artifacts while hardening the canonical seam.
- Across those runs, the replay harness stayed normalized-stable; the only repeated raw batch drift was the known `artifact_relpath` difference in replay output directories.
- Tasks `T06` and `T07` do not require golden changes.

## Remaining boundary notes

- This epic closes the lane-owned receipt contract and QA hardening work.
- Integrator-owned phase summary / note receipts remain separate from these canonical fiscal rows.
- No lane-owned follow-up task remains ready after `T07`; the next open work is outside the tooling/qa lane frontier.

## Epic outcome

`V03-R0-001` is ready to remain `done` in backlog state because:

- ledger receipts are the canonical economic audit trail for the scoped mutation surfaces
- receipt snapshots are deterministic and fixture-backed
- receipt-heavy regressions and perf-sensitive flows now have explicit guard coverage

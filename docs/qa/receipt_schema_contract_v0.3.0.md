# Receipt Schema Contract v0.3.0

Last updated: 2026-03-26
Task: `V03-R0-001-T02`

## Scope

This contract locks the lane-owned scaffold for canonical fiscal receipts without editing integrator-owned orchestration surfaces.

- Canonical module: `src/sim/domains/economy/receipts.ts`
- Current integrator boundary: `src/sim/turn.ts` and `src/sim/phases/**` still own `PhaseReceiptV0` summary and note strings.
- Follow-on routing tasks should target this contract when they replace prose-only coin and stores receipts with ordered ledger-owned rows.

## Canonical field order

Snapshot serialization must emit fields in this exact order:

1. `schema_version`
2. `receipt_id`
3. `turn`
4. `phase`
5. `phase_sequence`
6. `category`
7. `counterparty_kind`
8. `counterparty_id`
9. `counterparty_label`
10. `asset`
11. `delta`
12. `balance_after`
13. `summary`
14. `rule_id`
15. `related_actor_ids`

## Deterministic sort tuple

Receipt snapshots sort rows by this tuple:

1. `turn`
2. `phase`
3. `phase_sequence`
4. `category`
5. `counterparty_kind`
6. `counterparty_id`
7. `counterparty_label`
8. `asset`
9. `receipt_id`

`related_actor_ids` are sorted lexicographically before serialization.

## Canonical asset names

- `coin` -> `manor.coin`
- `food_stores` -> `manor.bushels_stored`
- `meat_stores` -> `manor.meat_stores` (schema scaffold only on this branch; no active writer exists yet)
- `tax_due_coin` -> `manor.obligations.tax_due_coin`
- `tithe_due_bushels` -> `manor.obligations.tithe_due_bushels`
- `arrears_coin` -> `manor.obligations.arrears.coin`
- `arrears_bushels` -> `manor.obligations.arrears.bushels`

## Notes

- `schema_version` is locked to `fiscal_receipt_v1`.
- `category` remains a stable string field so later routing tasks can reuse the fiscal packet taxonomy without reopening the schema.
- This task does not wire runtime receipt emission yet; it only defines the stable contract and invariant coverage that later routing tasks must honor.

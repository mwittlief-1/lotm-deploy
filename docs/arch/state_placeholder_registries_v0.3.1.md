# State Placeholder Registries v0.3.1

Last updated: 2026-03-30  
Task: `V03-R1-002-T06`

## Scope

This note records the first additive economy and portfolio placeholder registries carried through the `V03-R1-002-T03` migration runner scaffold.

The goal is to prove the ordered migration contract can add new state-owned registry surfaces without changing current sim mechanics.

## Economy placeholder

The economy placeholder is stored at `state.economy`.

Contract:

- `schema_version`: `economy_registry_placeholder_v1`
- `surface_id`: `manor_economy_surface`
- `surface_schema_version`: `manor_economy_surface_v1`
- `tracked_state_paths`: stable ordered list of the persisted manor economy fields currently treated as durable balances or dues

Tracked state paths:

- `manor.bushels_stored`
- `manor.coin`
- `manor.meat_stores`
- `manor.obligations.arrears.bushels`
- `manor.obligations.arrears.coin`
- `manor.obligations.tax_due_coin`
- `manor.obligations.tithe_due_bushels`
- `manor.obligations.war_levy_due`

Migration behavior:

- missing `manor.meat_stores` is backfilled to `0`
- the placeholder registry metadata is added or refreshed deterministically
- no receipt journals, production summaries, or other derived economy artifacts are persisted here yet

## Portfolio placeholder

The portfolio placeholder is stored at `state.portfolio`.

Contract:

- `schema_version`: `portfolio_registry_placeholder_v1`
- `positions`: ordered array, currently empty by construction

Migration behavior:

- legacy and scaffold-only states receive an additive empty portfolio container
- the migration does not infer totals, manor rollups, or holdings from current runtime state

## Bounded snapshot and export boundary

The placeholder registries are part of the bounded snapshot contract and may appear in turn-log snapshots when present on state.

Current closeout boundary:

- bounded snapshots include `state_schema_version`, `bounded_registry_manifest`, `economy`, and `portfolio`
- bounded snapshots still omit `institutions` and `service_records`
- `beliefs` remains non-enumerable on the snapshot object and must not serialize into JSON
- exported run summaries carry the manifest and state schema version, but still do not embed the full placeholder registry payloads

The QA stop conditions for this boundary are tracked in `docs/qa/state_migration_failure_qa_v0.3.1.md`.

## Plan ordering

The production migration plans now insert the new steps immediately after `state_schema_scaffold_v0_3_1`:

1. `economy_placeholder_v0_3_1`
2. `portfolio_placeholder_v0_3_1`

That ordering keeps the root schema metadata in place before registry-specific scaffolds run, while still avoiding any new entrypoint wiring.

## Non-perturbation boundary

These placeholder migrations are intentionally additive only.

They may:

- add `manor.meat_stores` when absent
- add `state.economy`
- add `state.portfolio`
- refresh the bounded registry manifest so the new registries are tracked explicitly

They must not:

- change existing manor coin, bushel, unrest, or obligation values
- infer portfolio totals
- persist process-local receipt journals
- alter replay ordering or RNG usage

## Epic closeout status

By the end of `V03-R1-002`:

- the state schema scaffold is explicit
- the migration runner carries the placeholder steps through all current entrypoints
- failure escalation is wrapped through `StateMigrationError`
- replay remains on the accepted deterministic hash after the placeholder additions

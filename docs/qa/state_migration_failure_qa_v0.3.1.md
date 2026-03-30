# State Migration Failure QA v0.3.1

Last updated: 2026-03-30  
Task: `V03-R1-002-T05`

## Scope

This note defines the expected QA behavior for bounded snapshot coverage and migration-stop escalation on the v0.3.1 state-migration scaffold.

## Bounded snapshot expectations

The bounded snapshot contract must continue to hold for turn-log snapshots:

- `state_schema_version` and `bounded_registry_manifest` are always present
- additive placeholder registries such as `economy` and `portfolio` may be present when they are part of the bounded contract
- `log` must never appear inside a bounded snapshot
- `institutions` and `service_records` remain outside the serialized bounded snapshot contract today
- `beliefs` may exist as a non-enumerable debug surface, but must not serialize into JSON snapshots

If any of the omitted fields begin serializing without an intentional contract change, treat that as a bounded-snapshot regression and stop the lane.

## Migration stop behavior

`runStateMigrationPlan()` now escalates step failures through `StateMigrationError`.

Expected operator-facing fields:

- `plan_id`
- `step_id`
- `step_index`
- `executed_step_ids`

Expected behavior:

- the first failing migration step stops the plan immediately
- later steps must not run after the failure
- callers should treat the wrapped error as a hard stop rather than continuing with partially migrated state

## When a stop is expected

A migration-related stop is expected when:

- a required root surface is missing or malformed for the current step assumptions
- a migration helper throws while refreshing a deterministic registry scaffold
- bounded snapshot assertions show version metadata missing or unbounded fields leaking into serialized snapshots

In these cases, do not accept replay output, do not normalize the failure away, and do not downgrade the stop into a warning. Fix the migration assumption or the bounded snapshot contract first, then rerun the gates.

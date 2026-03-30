# State Migration Runner v0.3.1

Last updated: 2026-03-30  
Task: `V03-R1-002-T06`

## Scope

This note defines the current migration-runner contract that sits on top of the `V03-R1-002-T02` state-schema scaffold.

The goal is to centralize ordered additive migration steps, carry placeholder registry additions, and make migration-stop behavior explicit without changing sim outcomes on healthy state.

## Contract

The migration runner lives in `src/sim/migrations.ts`.

Core interfaces:

- `StateMigrationStepV1`
  - `step_id`: stable identifier for logs, tests, and future migration artifacts
  - `description`: short operator-facing description
  - `apply(state)`: ordered in-place additive migration step
- `StateMigrationPlanV1`
  - `schema_version`: `state_migration_plan_v1`
  - `plan_id`: stable plan identifier tied to an entrypoint
  - `description`: operator-facing plan purpose
  - `steps`: ordered step list
- `StateMigrationRunResultV1`
  - `schema_version`: `state_migration_plan_v1`
  - `plan_id`
  - `executed_step_ids`: exact ordered step IDs that ran
- `StateMigrationError`
  - wraps the first failing migration step with `plan_id`, `step_id`, `step_index`, and the already executed step IDs
  - is the expected escalation surface when migration assumptions are violated

## No-op step

The reserved no-op contract is `NO_OP_STATE_MIGRATION_STEP`.

Purpose:

- gives future additive plans a stable placeholder step
- lets tests prove the runner can execute a plan without mutating unrelated state
- provides a stable seam for later migration logging without forcing a state change

## Active plans

The runner currently exposes three production plans:

- `CREATE_NEW_RUN_STATE_MIGRATION_PLAN`
  - entrypoint: `createNewRun()`
  - ordered steps:
    - `state_schema_scaffold_v0_3_1`
    - `economy_placeholder_v0_3_1`
    - `portfolio_placeholder_v0_3_1`
    - `people_first_v0_2_1`
    - `external_houses_v0_2_2`
    - `court_officers_v0_2_4`
    - `people_first_v0_2_1`
- `PREVIEW_LOAD_STATE_MIGRATION_PLAN`
  - entrypoint: `proposeTurn()`
  - ordered steps:
    - `state_schema_scaffold_v0_3_1`
    - `economy_placeholder_v0_3_1`
    - `portfolio_placeholder_v0_3_1`
    - `people_first_v0_2_1`
    - `external_houses_v0_2_2`
    - `house_registry_current_heads_v0_2_2`
    - `court_officers_v0_2_4`
- `LEGACY_APPLY_INPUT_STATE_MIGRATION_PLAN`
  - entrypoint: `applyDecisions()` only when the input is still legacy-shaped
  - ordered steps:
    - `state_schema_scaffold_v0_3_1`
    - `economy_placeholder_v0_3_1`
    - `portfolio_placeholder_v0_3_1`
    - `people_first_v0_2_1`

## Ordering rules

- Plans are additive and deterministic.
- A plan may repeat a step ID when the current sim contract already requires a second sync pass after another additive scaffold.
- The runner is not a product-logic orchestrator. It only wraps migration and registry-sync seams that already exist.

## Failure escalation

Healthy runs should never observe a migration error.

When a step throws, the runner now stops immediately and raises `StateMigrationError` with enough context for QA and operator triage:

- `plan_id`
- `step_id`
- `step_index`
- `executed_step_ids`

This is a hard-stop contract. Callers should not continue with partially migrated state.

## Current companion docs

- `docs/arch/state_registry_audit_v0.3.1.md`
  - original audit of durable registries and migration candidates
- `docs/arch/state_placeholder_registries_v0.3.1.md`
  - placeholder economy and portfolio registry contract introduced by `T04`
- `docs/qa/state_migration_failure_qa_v0.3.1.md`
  - bounded snapshot and migration-stop expectations added by `T05`

## Future extension guidance

Economy and portfolio steps should:

- keep stable `step_id` values
- stay deterministic and idempotent
- avoid mutating unrelated registries
- land as new plan steps, not as hidden side effects in unrelated helpers

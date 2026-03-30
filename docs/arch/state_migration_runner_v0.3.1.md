# State Migration Runner v0.3.1

Last updated: 2026-03-30  
Task: `V03-R1-002-T03`

## Scope

This note defines the first migration-runner contract that sits on top of the `V03-R1-002-T02` state-schema scaffold.

The goal is to centralize ordered additive migration steps without changing sim behavior or introducing economy and portfolio payloads ahead of `T04`.

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
    - `people_first_v0_2_1`
    - `external_houses_v0_2_2`
    - `court_officers_v0_2_4`
    - `people_first_v0_2_1`
- `PREVIEW_LOAD_STATE_MIGRATION_PLAN`
  - entrypoint: `proposeTurn()`
  - ordered steps:
    - `state_schema_scaffold_v0_3_1`
    - `people_first_v0_2_1`
    - `external_houses_v0_2_2`
    - `house_registry_current_heads_v0_2_2`
    - `court_officers_v0_2_4`
- `LEGACY_APPLY_INPUT_STATE_MIGRATION_PLAN`
  - entrypoint: `applyDecisions()` only when the input is still legacy-shaped
  - ordered steps:
    - `state_schema_scaffold_v0_3_1`
    - `people_first_v0_2_1`

## Ordering rules

- Plans are additive and deterministic.
- A plan may repeat a step ID when the current sim contract already requires a second sync pass after another additive scaffold.
- The runner is not a product-logic orchestrator. It only wraps migration and registry-sync seams that already exist.

## Future extension guidance

`T04` should extend this runner by adding new additive placeholder steps rather than by reopening entrypoint wiring.

Economy and portfolio steps should:

- keep stable `step_id` values
- stay deterministic and idempotent
- avoid mutating unrelated registries
- land as new plan steps, not as hidden side effects in unrelated helpers

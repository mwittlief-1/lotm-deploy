# Court Decision Budget Registry v0.3.0

Last updated: 2026-03-26
Task: `V03-R0-003-T02`

## Locked registry contract

`src/sim/domains/court/decisionBudget.ts` defines the first stable court decision-budget scaffold for `v0.3.0`.

- schema version: `court_decision_budget_v0`
- reset cadence: once per 3-year turn
- per-turn limit: `6`
- storage location for the scaffolded stateful helper: `state.house.court_decision_budget`

## Explicit action keys

The registry keeps stable per-action counters for:

- `gift_liege`
- `offering_church`
- `marriage_inbound`
- `marriage_scout`

These keys are locked now so `T03` and `T04` can wire charges without changing the registry shape.

## Deterministic decrement rules

- charges are normalized to non-negative integers
- no partial overspend is allowed
- if a requested charge is greater than remaining budget, the registry is left unchanged and the charge result returns `reason: "insufficient_budget"`
- `spent`, `remaining`, and `exhausted` are recomputed from `spent_by_action` so the stored shape stays self-consistent

## Test coverage added in this task

`tests/sim/decision_budget_domain.test.ts` now covers:

- stable registry initialization
- state attachment through `ensureCourtDecisionBudgetRegistry`
- deterministic decrement across explicit action keys
- exhaustion and blocked overspend behavior
- reset back to a fresh 6-decision, 3-year-turn registry

## Epic closeout note

The consolidated court-pacing closeout for the full `V03-R0-003` epic now lives in `docs/qa/court_pacing_v1_contract.md`.

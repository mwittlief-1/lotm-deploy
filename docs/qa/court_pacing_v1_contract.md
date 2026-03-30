# Court Pacing v1 Contract

Last updated: 2026-03-30
Task: `V03-R0-003-T07`

## Scope

This document closes the `V03-R0-003` court-pacing epic for the engine-core lane by consolidating the accepted decision-budget contract, the accepted QA evidence, and the remaining boundary notes.

The lane-owned scope closed by this epic is:

- `src/sim/domains/court/**`
- `src/sim/domains/economy/**` for court-budget charging surfaces
- `src/sim/domains/people/marriage.ts`
- `docs/qa/**`
- `ops/v0.3/**`

The accepted downstream work merged into this branch is:

- integrator-owned phase-output wiring from `V03-R0-003-T05`
- UI/experience budget rendering from `V03-R0-003-T06`

The unchanged integrator boundary remains:

- `src/sim/turn.ts`
- `src/sim/phases/**` outside the already accepted `T05` merge

## Canonical surfaces

- Canonical audit: `docs/qa/court_budget_audit_v0.3.0.md`
- Canonical registry note: `docs/qa/court_decision_budget_registry_v0.3.0.md`
- Canonical registry/domain seam: `src/sim/domains/court/decisionBudget.ts`
- Canonical offering charge seam: `src/sim/domains/economy/storeReceiptWriters.ts`
- Canonical marriage cost seam: `src/sim/domains/people/marriage.ts`
- Accepted phase-output evidence: `ops/v0.3/progress/runs/V03-R0-003-T05.md`
- Accepted UI evidence: `ops/v0.3/progress/runs/V03-R0-003-T06.md`

## Contract summary

### Core budget contract

The canonical court-pacing contract for `v0.3.0` now locks:

- a decision budget of `6` per `3`-year turn
- stable registry storage at `state.house.court_decision_budget`
- explicit action keys for `gift_liege`, `offering_church`, `marriage_inbound`, and `marriage_scout`
- deterministic normalization, no partial overspend, and recomputed `spent` / `remaining` / `exhausted` fields

### Accepted charge behavior

The accepted runtime interpretation on this branch is:

- liege gifts consume `1` court decision through the canonical settlement helper
- church offerings consume `1` court decision through the canonical settlement helper
- outbound marriage scouting consumes `2` court decisions
- inbound marriage handling (`accept` and `reject_all`) consumes `1` court decision
- budget exhaustion blocks the action before the lane-owned mutation fires

### Accepted output behavior

The accepted downstream `T05` and `T06` work means:

- preview and report-facing surfaces can read a deterministic `court_decision_budget_view_v0`
- ordered action rows are exposed without object-key iteration
- the play screen shows remaining budget, spent budget, and action costs without inventing post-`v0.3` agenda mechanics

## Accepted QA evidence

### T01 audit

`docs/qa/court_budget_audit_v0.3.0.md` records the pre-budget court-action inventory, identifies gifts/offerings as initially absent active surfaces, and maps where budget state needed to surface next.

### T02 registry lock

`docs/qa/court_decision_budget_registry_v0.3.0.md` and `tests/sim/decision_budget_domain.test.ts` now lock:

- the registry shape
- the four explicit action keys
- deterministic decrement and exhaustion behavior
- the three-year reset cadence

### T03 offering charges

`src/sim/domains/economy/storeReceiptWriters.ts` and `tests/sim/store_receipt_writers.test.ts` now lock:

- deterministic budget consumption for `liege_gift`
- deterministic budget consumption for `church_offering`
- blocked offering actions when budget is exhausted

### T04 marriage action costs

`src/sim/domains/people/marriage.ts` and `tests/sim/marriage_decision_budget.test.ts` now lock:

- `2` decision cost for outbound scouting
- `1` decision cost for inbound acceptance
- `1` decision cost for inbound reject processing
- deterministic blocked-scout behavior when only one decision remains

### T05 and T06 accepted downstream evidence

The accepted follow-on work in `ops/v0.3/progress/runs/V03-R0-003-T05.md` and `ops/v0.3/progress/runs/V03-R0-003-T06.md` proves that:

- the budget registry is exposed through deterministic phase outputs
- ordered budget rows and remaining/spent state are rendered in the UI

## Accepted diff notes

- `T03`, `T04`, and `T05` were allowed to change court-budget-facing artifacts while the decision-budget contract was being wired into runtime behavior and outputs.
- `T03` and `T04` changed action semantics but remained replay-deterministic on accepted seed batches.
- The current accepted replay baseline after the integrator `T05` merge and UI `T06` acceptance is `e68a2e361fa0c0a63755e1f24f3e4ac122ec83411d708c1d7e0cebe7d0601511`.
- `T06` and this closeout task `T07` do not require new golden changes.

## Remaining boundary notes

- This epic closes the scoped court-pacing contract for the `v0.3.0` decision budget.
- The engine-core lane does not own additional phase orchestration beyond the already accepted `T05` integrator merge.
- Any future agenda mechanics, richer court roles, or non-marriage court actions beyond the locked `v0.3.0` set would require new backlog scope.

## Epic outcome

`V03-R0-003` is ready to remain `done` in backlog state because:

- the six-decision court budget exists and is deterministic
- gifts, offerings, and marriage actions consume explicit budget costs
- accepted downstream phase and UI work already consume the locked budget contract

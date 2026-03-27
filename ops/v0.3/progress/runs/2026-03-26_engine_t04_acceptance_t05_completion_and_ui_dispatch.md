# Integrator Acceptance And Dispatch

**Date:** 2026-03-26
**Branch:** codex/v0.3-refactor-kickoff

## Accepted lane work
- Engine Core: accepted `V03-R0-003-T04`, including the outbound-scout versus inbound-processing budget split in `src/sim/domains/people/marriage.ts`, the focused coverage in `tests/sim/marriage_decision_budget.test.ts`, and the lane run log at `ops/v0.3/progress/runs/V03-R0-003-T04.md`.

## Completed integrator work
- Completed `V03-R0-003-T05` by exposing `court_decision_budget_view_v0` through the marriage phase pipeline and adding deterministic phase-level coverage.

## New dispatch
- UI/Experience: opened `V03-R0-003-T06`
- `claimed_at`: `2026-03-26T22:19:30-0400`
- `claim_expires_at`: `2026-03-27T02:19:30-0400`
- `run_id`: `2026-03-26_ui_t06_dispatch`

## Still active
- Tooling/QA: `V03-R1-002-T02`

## Still blocked
- Economy/Fiscal remains blocked behind `V03-R1-002-T06`.
- World/topology remains blocked behind `V03-XMAP-001`.

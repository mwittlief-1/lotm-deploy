# Integrator Acceptance And Dispatch

**Date:** 2026-03-26
**Branch:** codex/v0.3-refactor-kickoff

## Accepted lane work
- Engine Core: accepted `V03-R0-003-T03`, including the settlement-budget wiring in `src/sim/domains/economy/storeReceiptWriters.ts`, focused receipt-writer coverage, and the lane run log at `ops/v0.3/progress/runs/V03-R0-003-T03.md`.
- Tooling/QA: accepted `V03-R1-002-T01`, including `docs/arch/state_registry_audit_v0.3.1.md` and the lane run log at `ops/v0.3/progress/runs/V03-R1-002-T01.md`.
- Economy/Fiscal: accepted `V03-R1-003-T01`, including `docs/qa/obligations_audit_v0.3.1.md` and the lane run log at `ops/v0.3/progress/runs/V03-R1-003-T01.md`.

## New dispatch
- Engine Core: opened `V03-R0-003-T04`
- `claimed_at`: `2026-03-26T21:50:40-0400`
- `claim_expires_at`: `2026-03-27T01:50:40-0400`
- `run_id`: `2026-03-26_engine_t04_dispatch`
- Tooling/QA: opened `V03-R1-002-T02`
- `claimed_at`: `2026-03-26T21:50:40-0400`
- `claim_expires_at`: `2026-03-27T01:50:40-0400`
- `run_id`: `2026-03-26_tooling_t02_dispatch`

## Verification
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch` twice
- `npm run repo:duplicates -- --json`

## Replay hashes
- run1: `d3e003863f3721bd17786848ebab252a71d551e184cbbf8ee3470906fda1e1a2`
- run2: `d3e003863f3721bd17786848ebab252a71d551e184cbbf8ee3470906fda1e1a2`

## Still blocked
- Economy/Fiscal has no next executable task until `V03-R1-002-T06` lands.
- UI remains downstream of integrator-owned `V03-R0-003-T05`.
- World/topology remains blocked behind `V03-XMAP-001`.

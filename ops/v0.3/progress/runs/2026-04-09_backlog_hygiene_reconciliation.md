# 2026-04-09 Backlog Hygiene Reconciliation

## Summary

- Rebased stale accepted work back to `done` in the authoritative backlog.
- Cleared the stale topology blocker on `V03-R1-006` now that `V03-XMAP-001` and `V03-R1-001-T04` are already done in kickoff truth.
- Reopened `V03-R1-006-T01` as the next honest frontier.

## Status Rebases

- `V03-R0-001` rebased from `ready` to `done` based on the accepted task chain `V03-R0-001-T01..T07` and the existing epic closeout at `ops/v0.3/progress/runs/V03-R0-001.md`.
- `V03-R0-004` rebased from `ready` to `done` because its task chain `V03-R0-004-T01..T06` is already marked done and the shipped UI surfaces remain present on kickoff truth.
- `V03-R0-006` rebased from `ready` to `done` because its task chain `V03-R0-006-T01..T06` is already marked done and the accepted multi-asset fiscal baseline remains on kickoff truth.
- `V03-R1-003-T07` and epic `V03-R1-003` rebased to `done` based on the accepted obligations ladder surfaces in `src/sim/domains/economy/obligationEnforcement.ts`, `src/sim/domains/economy/obligationTangibleBite.ts`, `src/sim/domains/economy/retainerUpkeep.ts`, related tests, and the refreshed docs in `docs/arch/obligations_enforcement_ladder_v0.3.1.md`.
- `V03-R2-001-T01..T08` and epic `V03-R2-001` rebased to `done` based on the accepted portfolio baseline still present on kickoff truth in `src/sim/domains/economy/portfolioRegistry.ts`, `src/sim/domains/economy/portfolioAggregation.ts`, `src/sim/domains/economy/portfolioAnalysis.ts`, the phase hooks, UI portfolio surfaces, and the existing portfolio regression tests and docs.
- `V03-R3-005-T01..T05` and epic `V03-R3-005` rebased to `done` based on the accepted realm political weather baseline still present on kickoff truth in `src/sim/domains/realm/politicalWeather.ts`, reporting surfaces, fixtures, and contract coverage.

## Reopened Frontier

- `V03-R1-006-T01` is now `ready`.
- `V03-R1-006-T02..T05` were changed from stale `blocked` state to `todo` because their topology prerequisites are already satisfied and only their same-lane predecessors remain.

## Follow-on

- Next lane to dispatch: Social `V03-R1-006-T01`
- Self-advance remains allowed for later same-lane steps when the predecessor closes cleanly and no new cross-lane blocker appears.

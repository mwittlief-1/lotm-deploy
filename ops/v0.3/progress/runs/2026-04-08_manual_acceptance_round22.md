# v0.3 Manual Acceptance Round 22

Date: 2026-04-08
Branch: codex/v0.3-refactor-kickoff

Accepted task:
- Social `V03-R3-003-T02`

Accepted implementation:
- `src/sim/domains/court/agendaRegistry.ts`
- `tests/sim/agenda_registry.test.ts`
- `ops/v0.3/progress/runs/V03-R3-003-T02.yaml`

Queue decisions:
- Marked Social `V03-R3-003-T02` done.
- Cleared the stale active claim for Social.
- Left Social `V03-R3-003-T03` unavailable because it still depends on `V03-R2-006-T06`.

Notes:
- The same-lane pre-promotion policy is working as intended now; this stop is no longer a scheduler-promotion problem.
- On integrated kickoff truth, replay remained on the accepted hash even though the lane-local run recorded a different stable hash.
- There is no honest same-lane follow-on to dispatch until the grants chain reaches `V03-R2-006-T06`, or that dependency graph is otherwise rebased.

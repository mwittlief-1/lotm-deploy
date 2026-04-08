# v0.3 Manual Acceptance Round 21

Date: 2026-04-08
Branch: codex/v0.3-refactor-kickoff

Accepted task:
- Social `V03-R3-003-T01`

Accepted implementation:
- `docs/ux/v0.3.3_court_agenda_surface_audit.md`
- `ops/v0.3/progress/runs/V03-R3-003-T01.yaml`

Queue decisions:
- Marked Social `V03-R3-003-T01` done.
- Promoted and dispatched Social `V03-R3-003-T02`.
- Updated the same-lane continuation policy so immediate successors may be pre-promoted to `ready` when the only unmet dependency is the active same-lane predecessor.

Notes:
- Social was not blocked by a real dependency after `T01`; it was blocked because `T02` still sat at `todo` in the control-plane snapshot.
- The new policy removes that scheduler-promotion stall for clean same-lane chains while keeping cross-lane coordination on kickoff truth.
- `V03-R3-003-T03` remains blocked on `V03-R2-006-T06`.

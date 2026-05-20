# PTL V04-TOOL-CLEANUP-001 Triage Disposition

Date: 2026-05-20
Run timestamp: 2026-05-20T15:34:10-0400
Status: `ACCEPT_PHASE_1_INVENTORY_NO_CLEANUP_AUTHORIZED`
Report: `ops/v0.4/cleanup/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_REPORT.md`

## Disposition

PTL accepts the Phase 1 cleanup triage report as a useful read-only dirty-tree inventory.

This acceptance does not authorize cleanup, revert, delete, stash, stage, commit, archive movement, formatter runs, baseline updates, fixture updates, schema changes, runtime/source edits, UI edits, or active backlog/progress mutation.

## Key Findings Accepted

- `ops/v0.4/**` is untracked but contains active v0.4 control-plane, dispatch, review, and PTL disposition artifacts. It must be preserved, not cleaned as generic debris.
- The active Local Matters review packet remains unaccepted: `RETURN_FOR_REVISION_NO_PTL_ACCEPTANCE`.
- The Local Matters candidate implementation paths are separable from broader repo churn, but must remain under Engineering revision.
- The checkout contains substantial forbidden or red-zone dirty paths, including active v0.3 backlog/progress, schemas, fixtures, broad UI, `src/sim/turn.ts`, and multiple blocked mechanic areas.
- Generated artifacts and stale v0.3 closure/control files require evidence ownership review before any deletion or archive action.
- Active canon and canon-planning untracked files must not be treated as disposable untracked debris.

## Caveat

The report records a current-state discrepancy: the event activation/classification files cited in the prior Local Matters PTL disposition are not present in its current status snapshot. This does not automatically resolve the returned Local Matters packet. Engineering must still return a revised packet or PTL must separately reconcile the discrepancy before Local Matters acceptance can resume.

## Recommended Next Phase

Authorize only this next cleanup phase:

`PHASE2-A_CONTROL_ARTIFACT_PRESERVE`

Goal:

- preserve `ops/v0.4/**` as a standalone PTL control-plane bundle;
- keep runtime/source/test changes out of that bundle;
- include the cleanup dispatch, cleanup report, PTL Local Matters disposition, and PTL response to Engineering;
- do not stage or commit until PTL explicitly requests publication mechanics.

Do not begin red-zone cleanup, generated artifact deletion, v0.3 artifact archive, Local Matters implementation cleanup, or broad runtime/UI/test cleanup until separate PTL dispatch.

## Required Phase 2-A Output

Return a short control-artifact preservation packet listing:

- exact `ops/v0.4/**` files proposed for preservation;
- any `ops/v0.4/**` files that should be excluded or renamed;
- confirmation that no runtime/source/test/schema/fixture/backlog files were edited;
- recommended publication path: commit, PR, archive bundle, or hold.

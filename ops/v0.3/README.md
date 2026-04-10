# ops/v0.3 — Automation Execution Contract (Canonical)

**Last Updated:** 2026-03-31
**Scope:** v0.3 unattended execution and backlog rebaseline.
**Source of Truth:** This folder is canonical for automation state and rules.

## Operating model
1. Ensure the kickoff baseline is split into a reviewable commit stack on `codex/v0.3-refactor-kickoff`.
2. Read `backlog.yaml`, `ownership-map.yaml`, `branch-policy.yaml`, `runtime-contract.yaml`, and `progress/latest.yaml`.
3. Treat imported `backlog.yaml` ids, statuses, deps, lane assignment, and `epics[].executable=false` as authoritative.
4. Normalize imported task paths to repo truth before claims: `src/sim/relationshipEngine.ts` -> `src/sim/domains/people/relationshipEngine.ts`, `src/components/**` -> `src/App.tsx` + `src/ui/**`, and `docs/ui/**` -> `docs/ux/**`.
5. Select from `tasks[]` only; `epics[]` are planning containers and never drive execution.
6. Schedule lane-parallel: at most one active claimed task per lane, with `cursor.current_task_id` tracking the first globally claimable ready task and `active_claims` tracking live lane work.
7. A task is claimable only when `status: ready`, deps are done, `claim.status: unclaimed`, the lane has no active claim, and the task is not blocked by topology policy.
8. Skip any task in `codex/v0.3-lane-world-topology` until `V03-XMAP-001` is `done`.
9. Treat the imported `xmap_alpha_v1` bundle already landed in `lotm-deploy` as the frozen world import surface while `V03-XMAP-001` remains blocked; do not run another import pass on kickoff.
10. After `V03-XMAP-001` clears, rebase `V03-R1-001-T01` and `V03-R1-001-T02` against the frozen import surface and start fresh topology coding at `V03-R1-001-T03`.
11. Claim the task before editing, set `claim_expires_at` to 4 hours ahead by default, and refresh the claim while the run remains active.
12. Reclaim only expired claims, and record the reclaim event in the run log.
13. Run `npm run ops:v0.3:validate`, `npm run ops:v0.3:scheduler-dry-run`, and `npm run ops:v0.3:rebase-dry-run` before accepting control-plane edits.
14. Run the task's `required_gates` from `gates.yaml`.
15. If gates pass, commit + push and open or update the PR to `codex/v0.3-refactor-kickoff` when lane work is involved.
16. Update `progress/latest.yaml` and append a run log under `progress/runs/`.
17. When a lane-owned task is accepted and the next decomposed task in that same lane is newly unblocked with no cross-lane dependency, integrator-only boundary, or escalation checkpoint, promote and dispatch it in the same reconciliation pass instead of leaving the lane idle.
18. For longer same-lane runs, integrator may pre-promote the immediate successor task to `ready` when its only unmet dependency is the currently active same-lane predecessor and no cross-lane blocker applies; the lane may self-claim that successor after locally closing the predecessor without waiting for another scheduler promotion pass.
19. Stop immediately on any E1 or E2 escalation from `escalation-policy.yaml`.

## Backlog model
- `releases[]` define the roadmap containers.
- `epics[]` define roadmap-sized outcomes and dependency planning.
- `tasks[]` define the executable queue for unattended work.
- Oversized epic-like work must be decomposed into `tasks[]` before unattended execution may select it.
- `V03-XMAP-001` is the external checkpoint that unlocks `codex/v0.3-lane-world-topology`.
- The frozen XMAP repo-truth surface in this repo is `data/map/xmap_alpha_v1/*` plus `src/sim/domains/world/**`, landed at kickoff commit `eaa9da5`.
- Until `V03-XMAP-001` is flipped to `done`, world/topology planning assumes `V03-R1-001-T01` and `V03-R1-001-T02` will be rebased against that frozen surface rather than rebuilt from a new import.

## Canonical precedence
- `ops/v0.3/*` is the machine-operated control plane.
- `docs/releases/v0.3_SCOPE_LOCK.md` is the authoritative product and release scope.
- `docs/releases/v0.3_FISCAL_SPINE_PACKET.md` is the authoritative economy contract.
- If older `v0.3` docs conflict with the files above, the newer scope lock and ops pack win.
- Historical run logs are informational only and never override `backlog.yaml`, `runtime-contract.yaml`, `gates.yaml`, or `progress/latest.yaml`.

## Archive policy
- `_archive/duplicates/YYYY-MM-DD/` is the canonical quarantine path for numbered duplicate cleanup.
- Numbered duplicates are never active sources of truth.
- Cleanup tasks may move duplicate artifacts into `_archive`, but may not reactivate them without an explicit restoration task.

## Intake Review
- Diff `ops/v0.3/*` first and classify each change as task decomposition, task status or claim update, or invalid implementation leakage.
- Accept only executable tasks that are lane-specific, single-run-sized, and fully declared by the imported task schema.
- Backfill the canonical `claim` object onto any imported task missing it before unattended selection is allowed.
- Rebase imported paths to current repo truth before treating them as scheduler-eligible.
- Reject any task that touches `src/sim/turn.ts` or `src/sim/phases/**` unless it is explicitly integrator work on `codex/v0.3-refactor-kickoff`.
- Reject any world or topology task that does not use `codex/v0.3-lane-world-topology`, does not depend on `V03-XMAP-001`, or marks itself ready before that checkpoint is done.

## Lane Coordination
- Canonical lanes are `codex/v0.3-refactor-kickoff`, `codex/v0.3-lane-tooling-qa`, `codex/v0.3-lane-social-mechanics`, `codex/v0.3-lane-engine-core`, `codex/v0.3-lane-ui-experience`, `codex/v0.3-lane-economy-fiscal`, and `codex/v0.3-lane-world-topology`.
- Bootstrap local lane branches from `codex/v0.3-refactor-kickoff` before dispatch.
- `progress/latest.yaml.active_claims` is the source of truth for in-flight lane work.
- Same-lane task chains should continue without an extra operator pause once the integrator accepts the prior task and no explicit checkpoint rule applies.
- Same-lane chains should also avoid scheduler-promotion stalls: when the only remaining unmet dependency is the current same-lane task, pre-promote the successor to `ready` so the lane can continue after local closeout.
- Record any claim reclaim, status rebase, or cross-lane override in a run log before mutating backlog or progress state.

## Claim Policy
- Default claim TTL is 4 hours unless a task-specific exception is documented in the control plane.
- Intake review may normalize missing claim blocks to the canonical unclaimed shape, but it does not create new active claims.
- Reclaim only expired claims. Record `prior_claimed_by`, `prior_claim_expires_at`, and `reclaiming_run_id` in the run log notes.

## Determinism summary
- No unplanned golden drift.
- Replay hashes must match when replay is required twice.
- RNG key or stream drift is an escalation unless the task explicitly allows it.
- `src/sim/turn.ts` and phase orchestration are integrator-only surfaces.

## Expected runtime logging
Each unattended run records:
- Node version
- npm version
- git branch
- git commit
- CI environment
- Vercel environment
- gate results
- replay hashes
- PR URL
- PR status

## References
- `docs/releases/v0.3_SCOPE_LOCK.md`
- `docs/releases/v0.3_FISCAL_SPINE_PACKET.md`
- `docs/arch/v0.3_REFACTOR_CHARTER.md`
- `docs/CODEMAP.md`
- `scripts/opsV03Normalize.rb`
- `scripts/opsV03Validate.rb`
- `scripts/opsV03SchedulerDryRun.rb`
- `scripts/opsV03RebaseDryRun.rb`

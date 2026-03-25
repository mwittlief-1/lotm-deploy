# ops/v0.3 — Automation Execution Contract (Canonical)

**Last Updated:** 2026-03-24
**Scope:** v0.3 unattended execution and backlog rebaseline.
**Source of Truth:** This folder is canonical for automation state and rules.

## Operating model
1. Ensure the kickoff baseline is split into a reviewable commit stack on `codex/v0.3-refactor-kickoff`.
2. Read `backlog.yaml`, `ownership-map.yaml`, `branch-policy.yaml`, and `progress/latest.yaml`.
3. Select the first task with `status: ready` whose `deps` are all `done`.
4. Execute only within the task's `allowed_paths` while honoring `forbidden_paths`, `requires_integrator`, determinism rules, and archive policy.
5. Run the task's `required_gates` from `gates.yaml`.
6. If gates pass, commit + push and open or update the PR to `codex/v0.3-refactor-kickoff` when lane work is involved.
7. Update `progress/latest.yaml` and append a run log under `progress/runs/`.
8. Stop immediately on any E1 or E2 escalation from `escalation-policy.yaml`.

## Canonical precedence
- `ops/v0.3/*` is the machine-operated control plane.
- `docs/releases/v0.3_SCOPE_LOCK.md` is the authoritative product and release scope.
- `docs/releases/v0.3_FISCAL_SPINE_PACKET.md` is the authoritative economy contract.
- If older `v0.3` docs conflict with the files above, the newer scope lock and ops pack win.

## Archive policy
- `_archive/duplicates/YYYY-MM-DD/` is the canonical quarantine path for numbered duplicate cleanup.
- Numbered duplicates are never active sources of truth.
- Cleanup tasks may move duplicate artifacts into `_archive`, but may not reactivate them without an explicit restoration task.

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

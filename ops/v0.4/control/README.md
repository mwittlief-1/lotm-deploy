# v0.4 Taskmaster Control Plane

Status: `CONTROL_FRONTIER_CLEAN_OBL_READY_AUTOMATIONS_PAUSED`
Date: 2026-05-22

## Purpose

This directory is the machine-readable v0.4 operating control plane.

The v0.4 Markdown packets remain evidence, approvals, dispatches, and review records. They are not the scheduler source of truth. The scheduler source of truth is:

- `ops/v0.4/control/state.yaml`

Generated or frontier-facing Markdown, including `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`, must be derived from the control state and current approved packets. Agents should not create numbered duplicate frontier files.

## Current Posture

The live Codex cron automations are paused while this control plane is introduced:

- `v0-4-ptl-review-loop`
- `v0-4-ba-dispatch-loop`
- `v0-4-engineering-orchestrator-loop`
- `v0-4-taskmaster-loop`

The immediate control-plane truth is that `V04-OBL-001-ENG` is approved, claimable, and dispatchable from `ops/v0.4/V04_OBL_001_ENGINEERING_DISPATCH_PACKET.md`.

The canonical unsuffixed frontier file has been restored at `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`. Numbered `PTL_RESPONSE_TO_ENGINEERING *.md` duplicates have been quarantined under `_archive/duplicates/2026-05-22/`.

The remaining active blocker is `V04-BLOCK-DIRTY-TREE-001`, which blocks broad cleanup and broad publication only. It does not block exact-scope implementation of `V04-OBL-001-ENG`.

## Manager Loop

Each lane automation should act as a manager, not as a single worker.

The manager loop is:

1. Read `state.yaml`.
2. Run `npm run ops:v0.4:validate`.
3. Run `npm run ops:v0.4:scheduler-dry-run -- --json`.
4. Claim all safe, non-overlapping ready work up to capacity.
5. Spawn subagents for disjoint work.
6. Keep the manager context open.
7. While subagents work, inspect for newly unblocked work in disjoint scopes.
8. When any subagent finishes, review the result, update state, and rerun the scheduler.
9. Continue until every task is done, claimed, or blocked by an explicit CEO/CPO/PTL decision or validation failure.

An automation run that completes one task and stops while additional safe work exists is an operating defect.

## Lane Ownership

- `taskmaster`: owns this control plane, state transitions, frontier rendering, scheduler validation, and automation configuration.
- `ptl`: reviews Engineering packets, records acceptance/return, and maintains approval/blocker interpretation.
- `ba`: drafts approval, dispatch, spec, proof, and decision packets.
- `engineering`: implements only active dispatch packets with exact approval text and allowed paths.
- `qa`: runs focused validation, preflight, replay, and evidence review when authorized.
- `cleanup`: executes exact repo-hygiene packets and produces reports.

## Subagent Policy

Subagents are expected.

Managers may spawn multiple subagents when:

- each subagent has a concrete task;
- write scopes are disjoint;
- each subagent is told it is not alone in the codebase;
- no subagent can claim product authority;
- blockers are returned to the manager rather than resolved silently.

Implementation subagents must edit only files named by the active dispatch. BA/PTL subagents must stay in ops/control surfaces unless explicitly authorized.

## Required Commands

Use these commands during bootstrap:

```sh
npm run ops:v0.4:validate
npm run ops:v0.4:scheduler-dry-run -- --json
```

After `V04-CONTROL-001` is executed, use:

```sh
npm run ops:v0.4:render-frontier
npm run ops:v0.4:validate
```

For routine manager runs after bootstrap cleanup, use:

```sh
npm run ops:v0.4:validate -- --json
npm run ops:v0.4:scheduler-dry-run -- --json
```

To install or refresh the local paused automation configs, use:

```sh
npm run ops:v0.4:install-automations
```

That command writes under `~/.codex/automations/`, so it requires local filesystem permission outside the repository.

## Stop Rules

This control plane does not override:

- `SOURCE_STATUS_INDEX.md`
- `AGENTS.md`
- `ops/v0.3/STOP_RULES.md`
- `ops/v0.3/DECISION_AUTHORITY_MATRIX.md`
- active CPO/CEO/PTL approval records

If `state.yaml` and a controlling approval packet conflict, stop and repair the state. Do not let agents infer authority from stale Markdown.

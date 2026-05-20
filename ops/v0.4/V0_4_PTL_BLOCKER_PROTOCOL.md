# v0.4 PTL Blocker Protocol

Date: 2026-05-20
Status: `ACTIVE_FOR_V0_4_PLANNING`

## Purpose

v0.4 planning must surface blockers early, with exact decision text and safe alternate work. A blocker should not stall all progress when safe parallel work exists.

## Required First-Line Labels

Every blocker packet must begin with exactly one first-line label:

- `CPO_DECISION_REQUIRED`
- `CEO_PRIORITY_REQUIRED`
- `RED_ZONE_OVERRIDE_REQUIRED`
- `SCHEDULER_BLOCKED`

## Required Blocker Fields

Each blocker must include:

- label;
- title;
- GitHub issue URL when created;
- affected lane;
- candidate backlog item ID if known;
- source files or canon references;
- stop rule or decision boundary;
- why current authorization is insufficient;
- options considered;
- PTL recommendation;
- exact decision text requested;
- safe parallel work available while blocked;
- files or paths that must not be touched before decision;
- deadline or sequencing impact if any.

## Exact Decision Text Format

Decision text should be copy/pasteable. Examples:

- `AUTHORIZE_V0_4_TRANCHE_LEGIBILITY_FIRST_PLANNING_ONLY`
- `AUTHORIZE_V0_4_LOCAL_MATTERS_CATALOG_AND_PROOF_ONLY_NO_LIVE_MUTATION`
- `AUTHORIZE_V0_4_NARROW_LIVE_MAINTENANCE_COIN_LABOR_TRANCHE`
- `HOLD_V0_4_RED_ZONE_RUNTIME_WORK_CONTINUE_SAFE_PARALLEL_PLANNING`

## Options Requirement

Every blocker must present at least two options unless there is only one valid authority path.

Each option must state:

- product effect;
- implementation effect;
- red-zone exposure;
- validation/gate expectation;
- what remains blocked.

## Safe Parallel Work Rule

While blocked, Engineering/PTL must continue safe parallel work if available. The blocker packet must name one or more safe items from `V0_4_SAFE_PARALLEL_WORK_QUEUE.md`, or explain why no safe work exists.

## Escalation Behavior

- `CPO_DECISION_REQUIRED` - use for product interpretation, scope, catalog, spec, or guided tester choices.
- `CEO_PRIORITY_REQUIRED` - use when two or more valid product strategies compete for priority or resource allocation.
- `RED_ZONE_OVERRIDE_REQUIRED` - use when implementation would cross stop rules.
- `SCHEDULER_BLOCKED` - use when no current claimable task exists or active backlog state cannot safely express the next task.

## Dashboard Rule

Every active blocker must be added to `V0_4_PTL_BLOCKER_DASHBOARD.md` with status, owner, requested decision, and safe parallel work.

Resolved blockers remain listed with disposition and date.

## GitHub Notification Rule

For any CPO/CEO blocker, create or update a GitHub issue assigned to `mwittlief-1` and directly mention `@mwittlief-1` in the issue body. Use the labels defined in `V0_4_NOTIFICATION_PROTOCOL.md`.

The issue body must begin with the first-line blocker label, then the mention, then the required blocker fields. GitHub issue assignment plus direct mention is the primary push-notification path for v0.4.

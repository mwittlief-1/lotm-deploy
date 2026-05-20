# V04-TOOL-CLEANUP-001 Repo Cleanup Triage Dispatch

Date: 2026-05-20
Status: `DISPATCH_READY_READ_ONLY_FIRST`
Owner: PTL
Working directory: `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`

## Mission

Create a holistic dirty-checkout cleanup inventory and proposed cleanup plan without editing the repo.

This is a repo hygiene/control-plane task. It is not Engineering implementation, not Local Matters acceptance, not v0.3 reopening, and not authorization to mutate runtime/source/test/schema/fixture/backlog files.

## Current Context

v0.3 is closed with soft-time performance/reliability debt recorded.

The active v0.4 Engineering frontier remains:

`V04-LOCAL-LIVE-001 Local Matters first live mutation tranche`

Current PTL disposition for that packet:

- `RETURN_FOR_REVISION_NO_PTL_ACCEPTANCE`
- disposition file: `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md`
- Engineering-facing response: `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`

Known issue:

- The checkout is broadly dirty.
- `ops/v0.4/` is untracked but contains active control, dispatch, review, and PTL disposition artifacts.
- Local Matters candidate work is mixed with unclaimed event activation/classification work and broader repo churn.

Open GitHub blockers remain:

- `https://github.com/mwittlief-1/lotm-deploy/issues/23` - guided tester boundary.
- `https://github.com/mwittlief-1/lotm-deploy/issues/26` - actor accounting and fiscal bridge.
- `https://github.com/mwittlief-1/lotm-deploy/issues/27` - hidden seed and fiscal/labor visibility.

## Required Reading

Read these first:

- `AGENTS.md`
- `SOURCE_STATUS_INDEX.md`
- `ops/v0.3/V0_3_CLOSURE_RECORD.md`
- `ops/v0.4/README.md`
- `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`
- `ops/v0.4/V0_4_PTL_BLOCKER_DASHBOARD.md`

Also preserve the active canon guardrails named by `AGENTS.md`.

## Phase 1: Read-Only Inventory

Do not edit files.
Do not stage files.
Do not delete files.
Do not run formatters.
Do not run cleanup scripts.
Do not stash, reset, checkout, restore, or move files.

Allowed commands include read-only inspection:

- `git status --short`
- `git diff --name-status`
- `git diff --stat`
- `git diff -- <path>`
- `find`
- `rg`
- `sed`
- `nl`
- `ls`

Do not run broad test suites during inventory. Focus on repository state classification.

## Required Inventory Buckets

Classify dirty paths into these buckets:

1. `V04_CONTROL_ARTIFACTS`
   - `ops/v0.4/**`, including dispatch packets, review packets, PTL responses, safe queue docs, red-zone docs, blocker dashboards.

2. `LOCAL_MATTERS_CANDIDATE_SET`
   - `src/content/events.ts`
   - `src/sim/phases/phase_events.ts`
   - `src/sim/domains/experience/localMatters.ts`
   - `tests/sim/local_matters_live_tranche.test.ts`
   - directly related v0.4 review/disposition files.

3. `UNCLAIMED_EVENT_ACTIVATION_CLASSIFICATION`
   - `src/sim/domains/experience/eventActivation.ts`
   - `src/sim/domains/experience/eventClassification.ts`
   - `tests/sim/event_activation_contract.test.ts`
   - `tests/sim/event_classification_contract.test.ts`
   - any imports or runtime use from `src/content/events.ts`.

4. `FORBIDDEN_OR_RED_ZONE_PATHS`
   - `ops/v0.3/backlog.yaml`
   - `ops/v0.3/progress/latest.yaml`
   - `docs/schemas/**`
   - `tests/fixtures/**`
   - golden/baseline files
   - `src/sim/turn.ts`
   - broad `src/ui/**`
   - runtime preset initialization
   - live maintenance Coin/Labor
   - obligation collector rebasing
   - Food mutation
   - A/R/T mutation
   - marriage, succession, claims, regency, justice, or coercion mutation.

5. `STALE_V03_CONTROL_OR_CLOSURE_ARTIFACTS`
   - root `REVIEW_PACKET.md`
   - `ops/v0.3/implementation_readiness/**`
   - v0.3 progress/run reports
   - old v0.3 QA/release readiness artifacts.

6. `GENERATED_ARTIFACTS`
   - `qa_artifacts/**`
   - `test-results/**`
   - `var/**`
   - temporary replay/preflight outputs
   - generated reports that are not current accepted evidence.

7. `BROAD_RUNTIME_UI_TEST_CHURN`
   - unrelated or mixed `src/**`, `tests/**`, `scripts/**`, `package.json`, `.github/**`, docs, and world-foundation artifacts not already classified.

8. `UNKNOWN_REQUIRES_OWNER_DECISION`
   - anything whose ownership or authority is ambiguous.

## Required Deliverable

Create one read-only cleanup report under:

`ops/v0.4/cleanup/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_REPORT.md`

The report must include:

- summary of total dirty/tracked/untracked/deleted counts;
- bucketed path inventory;
- high-risk quarantine list;
- likely owner for each bucket;
- recommended cleanup order;
- paths that must not be touched without PTL/CPO/CEO decision;
- whether any file appears to be an active Engineering review packet;
- whether any dirty path appears to violate the current Local Matters dispatch boundary;
- proposed Phase 2 cleanup actions, but no execution.

## Phase 2 Is Not Authorized Yet

Do not perform cleanup actions until PTL reviews the Phase 1 report and explicitly dispatches a Phase 2 bucket.

Not authorized in this dispatch:

- reverting files;
- deleting generated artifacts;
- moving files to archive;
- staging or committing;
- stashing;
- normalizing line endings;
- running formatters;
- editing runtime/source/test/schema/fixture/backlog files;
- mutating `ops/v0.3/backlog.yaml` or `ops/v0.3/progress/latest.yaml`;
- marking Local Matters accepted.

## Acceptance Criteria

PTL can accept Phase 1 if:

- the report is complete enough to support surgical cleanup;
- no files outside `ops/v0.4/cleanup/**` were edited;
- every red-zone or forbidden path is clearly quarantined;
- active v0.4 control artifacts are preserved;
- Local Matters implementation review remains separate from repo cleanup;
- recommended Phase 2 actions are bucketed and reversible.

## Suggested New-Chat Prompt

Use this in the new chat:

```text
Work from /Users/matt_wittlief_home/Documents/GitHub/lotm-deploy.

You are executing V04-TOOL-CLEANUP-001 Repo Cleanup Triage as a read-only-first PTL-controlled repo hygiene lane.

First read:
- AGENTS.md
- SOURCE_STATUS_INDEX.md
- ops/v0.3/V0_3_CLOSURE_RECORD.md
- ops/v0.4/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_DISPATCH.md
- ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md
- ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md

Do not edit, stage, revert, delete, move, stash, format, or clean files except for creating the required report under ops/v0.4/cleanup/.

Create ops/v0.4/cleanup/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_REPORT.md with the bucketed dirty-tree inventory, high-risk quarantine paths, owner decisions needed, and proposed Phase 2 cleanup plan. Do not execute Phase 2.
```

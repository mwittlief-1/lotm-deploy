# V04-TOOL-CLEANUP-002 Repo Cleaning Lane Dispatch

Date: 2026-05-20
Status: `DISPATCH_READY_BUCKETED_CLEANUP`
Owner: PTL
Working directory: `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`

## Mission

Reduce repo confusion by turning the current dirty checkout into a controlled set of preserved, held, and cleaned buckets.

This lane is repo hygiene. It is not Engineering implementation, not v0.4 feature acceptance, not v0.3 reopening, and not authorization to mutate product/runtime behavior.

## Current PTL Position

Other PTL threads own Engineering review. This cleanup lane should not re-review Local Matters implementation except to preserve its accepted/held boundaries in the cleanup plan.

Current relevant dispositions:

- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVISION_001_ACCEPTANCE_2026-05-20.md`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`
- `ops/v0.4/cleanup/PTL_V04_TOOL_CLEANUP_001_TRIAGE_DISPOSITION_2026-05-20.md`
- `ops/v0.4/cleanup/PTL_V04_TOOL_CLEANUP_001_PHASE2A_PRESERVATION_DISPOSITION_2026-05-20.md`

Current accepted cleanup premise:

- Preserve `ops/v0.4/**` as the active control-plane bundle.
- Do not treat active canon/control docs as disposable debris.
- Do not perform blanket cleanup.
- Do not touch red-zone/runtime/source/schema/fixture/backlog paths without explicit owner/action table approval.

## Required Reading

Read first:

- `AGENTS.md`
- `SOURCE_STATUS_INDEX.md`
- `ops/v0.3/V0_3_CLOSURE_RECORD.md`
- `ops/v0.4/cleanup/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_REPORT.md`
- `ops/v0.4/cleanup/PTL_V04_TOOL_CLEANUP_001_TRIAGE_DISPOSITION_2026-05-20.md`
- `ops/v0.4/cleanup/V04_TOOL_CLEANUP_001_PHASE2A_CONTROL_ARTIFACT_PRESERVATION_PACKET.md`
- `ops/v0.4/cleanup/PTL_V04_TOOL_CLEANUP_001_PHASE2A_PRESERVATION_DISPOSITION_2026-05-20.md`
- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVISION_001_ACCEPTANCE_2026-05-20.md`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`

## Non-Negotiable Guardrails

Never run:

- `git reset --hard`
- `git clean`
- broad `git restore .`
- broad `rm -rf`
- broad formatter or lint-fix commands

Do not stage, commit, push, or open a PR unless the user explicitly asks after this lane returns.

Do not modify:

- `ops/v0.4/**` except to add this lane's cleanup reports under `ops/v0.4/cleanup/**`;
- `ops/v0.3/backlog.yaml`;
- `ops/v0.3/progress/latest.yaml`;
- `docs/schemas/**`;
- `tests/fixtures/**`;
- golden or baseline files;
- `src/sim/turn.ts`;
- broad `src/ui/**`;
- Local Matters accepted files;
- runtime/source/test files generally.

The first cleanup pass must bias toward holding uncertain work, not deleting it.

## Phase A: Owner/Action Table

Create:

`ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_OWNER_ACTION_TABLE.md`

The table must classify dirty paths into:

- `PRESERVE_CONTROL`
- `PRESERVE_ACTIVE_CANON`
- `HOLD_LOCAL_MATTERS_ACCEPTED`
- `HOLD_RED_ZONE_OWNER_DECISION`
- `HOLD_TRACKED_RUNTIME_OR_UI`
- `HOLD_TRACKED_TEST_OR_FIXTURE`
- `HOLD_STALE_V03_EVIDENCE_REVIEW`
- `CLEAN_UNTRACKED_GENERATED`
- `CLEAN_LOCAL_TOOL_OUTPUT`
- `UNKNOWN_HOLD`

For each bucket include:

- representative paths;
- exact action;
- owner;
- risk;
- whether execution is authorized in this lane.

## Phase B: Cleanup Execution Allowed In This Lane

After Phase A exists, this lane may execute only low-risk cleanup actions in these categories:

### Authorized

- Delete untracked local tool output that is not source, canon, control, QA evidence, or implementation work.
- Delete disposable local test runner cache/output when outside accepted evidence paths.
- Remove empty directories left by cleanup, if and only if they are empty.

Examples likely allowed after confirmation in the owner/action table:

- `node_modules/.vite/vitest/results.json`
- `test-results/**` if untracked and not referenced by current accepted evidence.
- `var/**` if untracked and clearly local output.

### Not Authorized

Do not delete or restore:

- tracked modified files;
- tracked deleted files;
- untracked active canon/control docs;
- `ops/v0.4/**`;
- `qa_artifacts/**` unless separately proven disposable and not referenced;
- `_archive/**`;
- runtime/source/test/schema/fixture/backlog paths;
- any path listed under red-zone or owner-decision hold.

If uncertain, put it in `UNKNOWN_HOLD`.

## Phase C: Execution Report

Create:

`ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_EXECUTION_REPORT.md`

The report must include:

- before/after dirty path counts;
- exact files deleted, if any;
- exact files created by this lane;
- buckets intentionally held;
- commands run;
- confirmation no forbidden paths were modified;
- remaining recommended cleanup lanes.

## Acceptance Criteria

PTL can accept this cleaning lane if:

- `ops/v0.4/**` remains preserved;
- no runtime/source/test/schema/fixture/backlog file was changed by cleanup;
- no active v0.3 backlog/progress file was changed;
- no Local Matters accepted file was changed by cleanup;
- any deletion was limited to enumerated local/generated outputs;
- the repo has a clearer owner/action map for the remaining dirty tree;
- the report names the next concrete cleanup lane.

## Recommended Next Lanes After This

Likely next cleanup lanes:

1. `V04-TOOL-CLEANUP-003 Generated Artifact Disposition`
   - Decide which `qa_artifacts/**` are accepted evidence, stale evidence, or disposable.

2. `V04-TOOL-CLEANUP-004 v0.3 Stale Control Archive`
   - Decide what to preserve, archive, or restore among stale v0.3 packets and duplicate docs.

3. `V04-TOOL-CLEANUP-005 Runtime/UI Dirty Split`
   - Split broad runtime/UI/test churn into lane-owned hold/revert/review packets.

## Suggested Prompt For Worker

```text
Work from /Users/matt_wittlief_home/Documents/GitHub/lotm-deploy.

Execute V04-TOOL-CLEANUP-002 Repo Cleaning Lane Dispatch.

Read:
- AGENTS.md
- SOURCE_STATUS_INDEX.md
- ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_REPO_CLEANING_LANE_DISPATCH.md
- ops/v0.4/cleanup/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_REPORT.md
- ops/v0.4/cleanup/PTL_V04_TOOL_CLEANUP_001_PHASE2A_PRESERVATION_DISPOSITION_2026-05-20.md
- ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVISION_001_ACCEPTANCE_2026-05-20.md

Create ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_OWNER_ACTION_TABLE.md first.

Then execute only low-risk cleanup for enumerated untracked local/generated outputs. Do not touch runtime/source/test/schema/fixture/backlog/control/canon files. Do not stage, commit, push, restore, stash, reset, or run git clean.

Return ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_EXECUTION_REPORT.md with before/after counts, exact deletions, held buckets, and next recommended cleanup lane.
```

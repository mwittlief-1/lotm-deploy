# V04-TOOL-CLEANUP-003 Generated Artifact Disposition Report

Date: 2026-05-20
Run timestamp: 2026-05-20T18:08:00-0400
Status: `GENERATED_ARTIFACT_DISPOSITION_COMPLETE_NO_DELETION`

## Authority

This read-only disposition follows:

- `ops/v0.4/cleanup/PTL_V04_TOOL_CLEANUP_002_EXECUTION_DISPOSITION_2026-05-20.md`
- PTL next cleanup priority: `V04-TOOL-CLEANUP-003 Generated Artifact Disposition`
- User handoff: new dispatch available

No standalone `V04_TOOL_CLEANUP_003` dispatch file was found locally or on fetched remote refs during this run. Scope was therefore constrained to classification only. No generated artifact deletion, archive move, restore, staging, commit, push, or PR action was taken.

## Boundary Confirmation

Untouched in this lane:

- `qa_artifacts/**`
- `src/**`
- `tests/**`
- `docs/**`
- `ops/v0.3/**`
- `docs/schemas/**`
- `tests/fixtures/**`
- goldens and baselines
- Local Matters runtime/test files

Only this cleanup report was added under `ops/v0.4/cleanup/**`.

## Inventory Commands

- `git status --porcelain=v1 -uall -- qa_artifacts`
- `find qa_artifacts -maxdepth 3 -type f | sort`
- `rg -n "qa_artifacts/|v0\\.3\\.6_preflight|seed_replay|release_readiness|playtest_ops|world_foundation|rb007_bisect|v0\\.3_plumbing|v0\\.3_recovery|vitest\\.json|uat_gate\\.json" ops docs tests scripts src package.json README.md -S`
- `git ls-files -- qa_artifacts`
- `git fetch origin --prune`

## Current Dirty Artifact State

`qa_artifacts/**` currently has 480 dirty paths:

| Status | Count | Meaning |
| --- | ---: | --- |
| `??` | 463 | Untracked generated evidence or diagnostics |
| ` D` | 11 | Tracked artifact deletions already present in the checkout |
| ` M` | 5 | Modified tracked artifacts |
| `A ` | 1 | Added tracked artifact |

Top-level dirty grouping:

| Group | Count | Disposition |
| --- | ---: | --- |
| `qa_artifacts/release_readiness/**` | 156 | Preserve or archive-review only; not disposable in this lane. |
| `qa_artifacts/world_foundation/**` | 123 | Preserve; referenced by architecture docs, scripts, and tests. |
| `qa_artifacts/playtest_ops/**` | 65 | Preserve or archive-review; includes active UAT/export evidence and numbered duplicates. |
| `qa_artifacts/seed_replay/**` | 50 | Preserve or archive-review; replay evidence. |
| `qa_artifacts/v0.3_plumbing/**` | 43 | Preserve; current PLUMB and preflight disposition evidence. |
| `qa_artifacts/v0.3_recovery/**` | 20 | Preserve or archive-review; recovery/export evidence. |
| `qa_artifacts/rb007_bisect/**` | 11 | Stale diagnostic evidence; archive-review candidate. |
| `qa_artifacts/economy_balance/**` | 7 | Mixed stale evidence and local test harness output; owner decision required. |
| Root singletons | 5 | `vitest.json`, `uat_gate.json`, `v0.3.4_preflight.json`, `v0.3.6_preflight.json`, and one modified economy fixture. |

## Preserve Accepted Or Active Evidence

These groups are not deletion candidates without a later owner-specific acceptance or archive dispatch.

| Paths | Count | Owner | Reason |
| --- | ---: | --- | --- |
| `qa_artifacts/v0.3.6_preflight.json` | 1 | PTL / QA | Current PTL preflight-red evidence cited by v0.4 Local Matters return packets. |
| `qa_artifacts/release_readiness/2026-05-20/**` | 104 | PTL / Release | Cited by final closure gate review disposition and PTL replay checks. |
| `qa_artifacts/v0.3_plumbing/**` | 43 | PLUMB / QA | Referenced by PLUMB-009/010 evidence and current preflight disposition scripts/docs. |
| `qa_artifacts/playtest_ops/v0.3_recovery/**` | 42 | QA / Playtest Ops | Evidence bundles and manifests referenced by v0.3 recovery progress logs and scripts. |
| `qa_artifacts/world_foundation/**` | 123 | World Foundation / Architecture | Report fixtures, summaries, and bundles referenced by architecture docs, scripts, and tests. |
| `qa_artifacts/seed_replay/**` | 50 | QA / Determinism | Replay evidence; do not delete without replacement evidence acceptance. |
| `qa_artifacts/playtest_ops/v0.3.7/**` | 8 | QA / Playtest Ops | v0.3.7 story/export/UAT evidence. |
| `qa_artifacts/playtest_ops/uat_scenario_gate.json` | 1 | QA / Playtest Ops | Modified tracked UAT gate artifact; referenced by scripts and progress logs. |
| `qa_artifacts/playtest_ops/uat_scenarios_v0.3.json` | 1 | QA / Playtest Ops | Modified tracked UAT scenario control artifact. |
| `qa_artifacts/playtest_ops/playability_preset_pack_v1.json` | 1 | QA / Playtest Ops | Referenced by tests and closure scripts. |
| `qa_artifacts/vitest.json` | 1 | QA | Modified tracked QA result artifact referenced by v0.3 gate logs. |
| `qa_artifacts/uat_gate.json` | 1 | QA | Untracked root gate evidence; hold until QA refresh/disposition. |
| `qa_artifacts/economy_equilibrium/v0.3.0_food_meat_equilibrium_fixture.json` | 1 | Economy / QA | Modified tracked fixture artifact; not local-output disposal. |

## Hold For Stale Evidence Archive Review

These groups look stale or superseded, but they are still evidence. Recommended next action is archive/reconcile, not deletion.

| Paths | Count | Recommended Action |
| --- | ---: | --- |
| `qa_artifacts/economy_balance/v0.3.5/**` | 3 tracked deletions | Resolve with v0.3.5 artifact owner; do not restore or accept deletion in cleanup lane. |
| `qa_artifacts/playtest_ops/v0.3.5/**` | 10 dirty paths | Resolve with v0.3.5 playtest/evidence owner; includes 8 tracked deletions, 1 modified, 1 added. |
| `qa_artifacts/economy_balance/v0.3.4/**` | 2 untracked paths | Archive-review with economy balance evidence owner. |
| `qa_artifacts/release_readiness/2026-05-06/**` | 41 | Archive-review after v0.3 closure acceptance. |
| `qa_artifacts/release_readiness/2026-05-07/**` | 8 | Archive-review after v0.3 closure acceptance. |
| `qa_artifacts/release_readiness/2026-05-19/**` | 3 | Archive-review after v0.3 closure acceptance. |
| `qa_artifacts/seed_replay/v0.3.4/**` | 17 | Archive-review; older replay evidence. |
| `qa_artifacts/seed_replay/v0.3.7/**` | 12 | Archive-review; targeted replay evidence. |
| `qa_artifacts/rb007_bisect/**` | 11 | Archive-review; referenced by RB-007 diagnostic run log. |
| `qa_artifacts/v0.3_recovery/**` | 20 | Archive-review only after recovery/export evidence owner confirms supersession. |

## Future Disposable Candidate List

The following are the only observed candidates that look plausibly disposable or duplicate-like. They are not authorized for deletion by this report.

| Paths | Count | Reason | Required Future Action |
| --- | ---: | --- | --- |
| `qa_artifacts/economy_balance/test_harness/**` | 2 | Generated test harness output; referenced as an output directory by `tests/sim/fiscal_doe_script.test.ts`. | PTL/QA may authorize exact deletion if current test rerun can regenerate it. |
| `qa_artifacts/playtest_ops/uat_scenario_gate 2.json` | 1 | Numbered duplicate artifact; not canonical active file. | Archive under `_archive/duplicates/YYYY-MM-DD/` or delete only by duplicate-cleanup dispatch. |
| `qa_artifacts/playtest_ops/uat_scenarios_v0.3 2.json` | 1 | Numbered duplicate artifact; not canonical active file. | Archive under `_archive/duplicates/YYYY-MM-DD/` or delete only by duplicate-cleanup dispatch. |
| ignored `.DS_Store` files under `qa_artifacts/**` | present | Local macOS metadata, not evidence. | May be deleted only if a later lane authorizes ignored local-output cleanup under `qa_artifacts/**`. |

## Tracked Deleted Artifact Hold List

These tracked deletions remain held. Cleanup should not accept, restore, or remove them without the relevant owner.

- `qa_artifacts/economy_balance/v0.3.5/balance_review_closeout.json`
- `qa_artifacts/economy_balance/v0.3.5/maintenance_pressure_scenarios.json`
- `qa_artifacts/economy_balance/v0.3.5/runaway_detectors.json`
- `qa_artifacts/playtest_ops/v0.3.5/court_provisioning_uat_pack.json`
- `qa_artifacts/playtest_ops/v0.3.5/kpi_acceptance_bands.json`
- `qa_artifacts/playtest_ops/v0.3.5/obligations_uat_pack.json`
- `qa_artifacts/playtest_ops/v0.3.5/outbound_marriage_preset_coverage.json`
- `qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json`
- `qa_artifacts/playtest_ops/v0.3.5/uat_scenario_gate__preset_uat_arrears_enforcement.json`
- `qa_artifacts/playtest_ops/v0.3.5/uat_scenario_gate__preset_uat_grant_visibility.json`
- `qa_artifacts/playtest_ops/v0.3.5/uat_scenario_gate__preset_uat_hunting_proxy.json`

## Recommended Next PTL Decisions

1. `AUTHORIZE_V04_TOOL_CLEANUP_003A_LOCAL_ONLY_ARTIFACT_DISPOSAL`
   - Exact scope: delete only `qa_artifacts/economy_balance/test_harness/**` and ignored `.DS_Store` files under `qa_artifacts/**`; archive or delete numbered duplicates only if PTL confirms duplicate policy applies.
2. `AUTHORIZE_V04_TOOL_CLEANUP_003B_STALE_EVIDENCE_ARCHIVE_REVIEW`
   - Exact scope: assign QA/Release/Economy owners for stale v0.3.4/v0.3.5/release-readiness/replay diagnostic evidence, with archive destinations before any removal.
3. `HOLD_QA_ARTIFACTS_UNTIL_V03_CLOSURE_ACCEPTANCE`
   - Exact scope: preserve all `qa_artifacts/**` dirty state until closure and Local Matters acceptance decisions settle.

## Execution Result

No generated artifacts were changed. No tests were run because this was a read-only classification lane.

# V04-TOOL-CLEANUP-001 Repo Cleanup Triage Report

Date: 2026-05-20
Status: `PHASE_1_READ_ONLY_INVENTORY_COMPLETE`
Dispatch: `ops/v0.4/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_DISPATCH.md`
Working directory: `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`

## Scope And Guardrail

This report is the authorized Phase 1 cleanup inventory. No cleanup action was executed:

- no revert;
- no delete;
- no move;
- no stash;
- no staging or commit;
- no formatter;
- no broad test suite.

The only intended filesystem write for this dispatch is this report under `ops/v0.4/cleanup/`.

Inventory was captured with read-only inspection commands including `git status --porcelain=v1 -uall`, `git diff --name-status`, `git diff --stat`, `find`, `rg`, and `sed`.

## Summary Counts

Captured before creating this report:

| Metric | Count |
|---|---:|
| Total dirty paths from `git status --porcelain=v1 -uall` | 2095 |
| Tracked dirty paths | 319 |
| Untracked paths | 1776 |
| Deleted tracked paths | 100 |

Status detail:

| Status | Count |
|---|---:|
| Worktree modified (` M`) | 212 |
| Staged added, worktree modified (`AM`) | 2 |
| Staged added (`A `) | 4 |
| Worktree deleted (` D`) | 100 |
| Index and worktree modified (`MM`) | 1 |
| Untracked (`??`) | 1776 |

Tracked diff stat from `git diff --stat`:

- 315 tracked files changed in unstaged diff output.
- 50,398 insertions.
- 32,753 deletions.

## Primary Bucket Counts

| Bucket | Count | Primary Owner |
|---|---:|---|
| `V04_CONTROL_ARTIFACTS` | 33 | PTL / v0.4 control-plane |
| `LOCAL_MATTERS_CANDIDATE_SET` | 4 | Engineering, returned to PTL revision |
| `UNCLAIMED_EVENT_ACTIVATION_CLASSIFICATION` | 0 current paths | PTL/Engineering decision due to recorded blocker discrepancy |
| `FORBIDDEN_OR_RED_ZONE_PATHS` | 177 | PTL/CPO/CEO, lane owners by domain |
| `STALE_V03_CONTROL_OR_CLOSURE_ARTIFACTS` | 526 | PTL / v0.3 closure-control owner |
| `GENERATED_ARTIFACTS` | 485 | QA / Tooling owner |
| `BROAD_RUNTIME_UI_TEST_CHURN` | 437 | Engineering / domain lane owners |
| `UNKNOWN_REQUIRES_OWNER_DECISION` | 433 | PTL / canon/archive owners |

## Bucketed Inventory

### 1. `V04_CONTROL_ARTIFACTS`

All current `ops/v0.4/**` files are untracked and should be preserved until PTL decides how to commit or package them. These include the active planning workspace, red-zone packets, safe queue outputs, the Local Matters dispatch, the returned Engineering packet, PTL disposition, and this cleanup dispatch.

Exact current control paths before this report:

- `ops/v0.4/README.md`
- `ops/v0.4/V0_4_PLANNING_INTAKE.md`
- `ops/v0.4/V0_4_ROADMAP_RECONCILIATION.md`
- `ops/v0.4/V0_4_BACKLOG_CANDIDATE_MAP.md`
- `ops/v0.4/V0_4_RED_ZONE_CANDIDATES.md`
- `ops/v0.4/V0_4_SAFE_PARALLEL_WORK_QUEUE.md`
- `ops/v0.4/V0_4_PTL_BLOCKER_PROTOCOL.md`
- `ops/v0.4/V0_4_PTL_BLOCKER_DASHBOARD.md`
- `ops/v0.4/V0_4_NOTIFICATION_PROTOCOL.md`
- `ops/v0.4/V0_4_REVIEW_PACKET.md`
- `ops/v0.4/V0_4_UNBLOCK_AND_NOTIFY_BUNDLE_001_REVIEW_PACKET.md`
- `ops/v0.4/V0_4_CPO_CEO_DECISION_LOG_2026-05-20.md`
- `ops/v0.4/V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT.md`
- `ops/v0.4/V0_4_ENGINEERING_START_PROMPT.md`
- `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`
- `ops/v0.4/V04_TOOL_CLEANUP_001_REPO_CLEANUP_TRIAGE_DISPATCH.md`
- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`
- `ops/v0.4/red_zone/V04_RED_001_FIRST_RUNTIME_TRANCHE_SELECTION_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_LOCAL_MATTERS_LIVE_TRANCHE_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_MAINTENANCE_ECONOMY_TRANCHE_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_PRESET_INITIALIZATION_TRANCHE_PACKET.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
- `ops/v0.4/safe_queue/V04_EST_001_OBLIGATION_CATALOG_COMPLETION.md`
- `ops/v0.4/safe_queue/V04_HOUSE_005_HIDDEN_SUBSTRATE_CANDIDATE_POOL_CONTRACT.md`
- `ops/v0.4/safe_queue/V04_LEG_001_PLAYER_MENTAL_MODEL_CONTRACT.md`
- `ops/v0.4/safe_queue/V04_LEG_002_RECEIPT_EXPLANATION_VOCABULARY_AUDIT.md`
- `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`
- `ops/v0.4/safe_queue/V04_QA_001_UAT_SCRIPT_PACKAGE.md`
- `ops/v0.4/safe_queue/V04_QA_002_SOFT_TIME_DEBT_TRACKING_PLAN.md`
- `ops/v0.4/safe_queue/V04_QA_003_EVIDENCE_BUNDLE_TEMPLATE.md`
- `ops/v0.4/safe_queue/V04_QA_004_PM_STORY_COVERAGE_KPI_MANIFEST.md`
- `ops/v0.4/safe_queue/V04_TOOL_001_SOURCE_STATUS_HYGIENE_PASS.md`

Owner note: PTL should preserve these as the active v0.4 control-plane bundle. Do not clean them as generic untracked files.

### 2. `LOCAL_MATTERS_CANDIDATE_SET`

Current dirty Local Matters implementation paths:

- `M src/content/events.ts`
- `M src/sim/phases/phase_events.ts`
- `?? src/sim/domains/experience/localMatters.ts`
- `?? tests/sim/local_matters_live_tranche.test.ts`

Related v0.4 control files are bucketed primarily under `V04_CONTROL_ARTIFACTS`:

- `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`
- `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`

Current diff notes:

- `src/content/events.ts` imports `localMatters.ts`, creates event receipt context, and gates `evt_tool_breakage` coin deltas through `assertV04LocalMatterLiveMutationAllowed`.
- `src/sim/phases/phase_events.ts` sets `_active_event_receipt_context_v1` around event application, then restores prior context.
- The current implementation paths are within the dispatch's allowed path list, but the packet remains `RETURN_FOR_REVISION_NO_PTL_ACCEPTANCE`.

Owner note: Engineering owns revision. PTL acceptance is not granted.

### 3. `UNCLAIMED_EVENT_ACTIVATION_CLASSIFICATION`

Current `git status --porcelain=v1 -uall` shows no dirty/current paths for:

- `src/sim/domains/experience/eventActivation.ts`
- `src/sim/domains/experience/eventClassification.ts`
- `tests/sim/event_activation_contract.test.ts`
- `tests/sim/event_classification_contract.test.ts`

However, the active PTL disposition and response explicitly identify those paths as the blocking reason for returning `V04-LOCAL-LIVE-001`:

- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`

Current filesystem inspection also found no `eventActivation.ts`, no `eventClassification.ts`, and no matching tests. This is a current-state discrepancy, not a cleanup action. PTL/Engineering should decide whether the blocker was already locally removed, whether the report was generated against a slightly different dirty snapshot, or whether those files need a separate audit before any Local Matters acceptance.

Owner note: PTL/Engineering decision required before treating the returned packet as resolved.

### 4. `FORBIDDEN_OR_RED_ZONE_PATHS`

Primary red-zone and forbidden groups:

| Group | Count | Risk |
|---|---:|---|
| `src/ui/**` | 52 | Broad production UI integration/change outside Local Matters dispatch. |
| `tests/sim/**` red-zone-pattern paths | 46 | Marriage, succession, obligation, maintenance, food, relationship, and related mechanics tests. |
| `scripts/**` red-zone-pattern paths | 13 | Maintenance, preset, obligation, food/meat, and proof tooling changes. |
| `docs/qa/**` red-zone-pattern paths | 12 | Fixture, baseline, preset, maintenance, obligation, outbound-marriage evidence docs. |
| `tests/fixtures/**` | 11 | Forbidden fixture/baseline surface. |
| `tests/ui/**` red-zone-pattern paths | 10 | UI and preset/marriage/obligation surfaces. |
| `src/sim/domains/world/**` red-zone-pattern paths | 7 | Fiscal bridge, inherited improvements, mill/right/franchise income, identity graph. |
| `ops/v0.3/progress/runs/**` red-zone-pattern paths | 6 | v0.3 progress artifacts involving baseline/obligation/maintenance/preset. |
| `src/sim/domains/people/**` red-zone-pattern paths | 5 | Marriage, A/R/T, succession-related dirty files. |
| `src/sim/**` red-zone-pattern paths | 3 | Includes `src/sim/turn.ts`, `marriageMarket.ts`, and related runtime state. |
| `src/sim/domains/economy/**` red-zone-pattern paths | 2 | Maintenance/obligation/marriage settlement changes. |
| `src/sim/phases/**` red-zone-pattern paths | 2 | Marriage/obligation/succession phase changes. |
| `docs/schemas/**` | 1 | Schema promotion/change is forbidden. |
| `ops/v0.3/backlog.yaml` | 1 | Active v0.3 backlog mutation forbidden by dispatch. |
| `ops/v0.3/progress/latest.yaml` | 1 | Active progress mutation forbidden by dispatch. |
| `tests/goldenSeeds.test.ts` | 1 | Golden/baseline-adjacent test path. |

Highest-risk exact paths:

- `ops/v0.3/backlog.yaml`
- `ops/v0.3/progress/latest.yaml`
- `docs/schemas/hex_manor_data_models_current.md`
- `src/sim/turn.ts`
- `tests/goldenSeeds.test.ts`
- `tests/fixtures/**`
- `src/ui/**`
- `src/sim/domains/economy/maintenance.ts`
- `src/sim/domains/court/maintenance.ts`
- `src/sim/domains/economy/obligationRegistry.ts`
- `src/sim/domains/economy/obligationTangibleBite.ts`
- `src/sim/domains/economy/obligationScaleRebaseline.ts`
- `src/sim/domains/economy/foodSufficiencyContract.ts`
- `src/sim/domains/people/relationshipEngine.ts`
- `src/sim/domains/people/marriage.ts`
- `src/sim/domains/people/successionRegistry.ts`
- `src/sim/phases/phase_marriage.ts`
- `src/sim/phases/phase_obligations.ts`
- `src/sim/phases/phase_succession.ts`

Owner note: These paths must not be edited, restored, deleted, staged, or accepted without explicit PTL/CPO/CEO or relevant lane-owner decision.

### 5. `STALE_V03_CONTROL_OR_CLOSURE_ARTIFACTS`

Primary stale/control groups:

| Group | Count |
|---|---:|
| `ops/v0.3/progress/runs/**` | 392 |
| `docs/qa/**` | 37 |
| `ops/v0.3/implementation_readiness/**` | many single-file control packets |
| `docs/releases/v0.3*.md` and numbered duplicate release docs | multiple |
| root `REVIEW_PACKET.md` | 1 |
| `ops/v0.3/README.md`, `branch-policy.yaml`, `runtime-contract.yaml`, `templates/**` | several |

Notable exact paths:

- `AM REVIEW_PACKET.md`
- `AM ops/v0.3/implementation_readiness/PTL_DISPOSITION_REQUEST.md`
- `MM ops/v0.3/progress/runs/V03-R5-008-T03.md`
- multiple deleted April v0.3.5 run reports
- many untracked May v0.3 closure/readiness/progress reports
- many numbered duplicate docs such as `* 2.md` / `* 2.yaml`

Owner note: Treat these as historical/control-plane cleanup candidates. They should not be blindly deleted because some may be closure evidence, while numbered duplicates remain archive/quarantine candidates under the repo policy.

### 6. `GENERATED_ARTIFACTS`

Primary generated groups:

| Group | Count |
|---|---:|
| `qa_artifacts/release_readiness/2026-05-20/**` | 104 |
| `qa_artifacts/playtest_ops/v0.3_recovery/**` | 42 |
| `qa_artifacts/release_readiness/2026-05-06/**` | 41 |
| `qa_artifacts/seed_replay/v0.3.6/**` | 19 |
| `qa_artifacts/seed_replay/v0.3.4/**` | 17 |
| `qa_artifacts/v0.3_plumbing/seed_replay_batch_a/**` | 17 |
| `qa_artifacts/v0.3_plumbing/seed_replay_batch_b/**` | 17 |
| `qa_artifacts/world_foundation/scale_generated/**` | 13 |
| `qa_artifacts/seed_replay/v0.3.7/**` | 12 |
| `qa_artifacts/playtest_ops/v0.3.5/**` | 10 |
| `qa_artifacts/playtest_ops/v0.3.7/**` | 8 |
| `qa_artifacts/release_readiness/2026-05-07/**` | 8 |
| `var/**` | 4 |
| `test-results/**` | 1 |

Owner note: QA/Tooling should decide which generated artifacts are accepted evidence and which can be removed in Phase 2. Do not delete generated artifacts from this phase because some are referenced by closure/control records.

### 7. `BROAD_RUNTIME_UI_TEST_CHURN`

Primary broad groups:

| Group | Count |
|---|---:|
| `tests/sim/**` non-red primary group | 76 |
| `docs/arch/WORLDGEN_FOUNDATION_*.md` | 75 |
| `scripts/**` non-red primary group | 58 |
| `docs/product/**` | 45 |
| `tests/ui/**` non-red primary group | 45 |
| `src/sim/domains/world/**` non-red primary group | 35 |
| `src/sim/domains/people/**` non-red primary group | 22 |
| `src/sim/**` non-red primary group | 21 |
| `src/sim/domains/economy/**` non-red primary group | 16 |
| `.github/ISSUE_TEMPLATE/*.yml` | 3 |
| root/project metadata, app entry, version/build info | several |

Representative exact paths:

- `.gitignore`
- `AGENTS.md`
- `README.md`
- `package.json`
- `docs/BUILD_INFO.json`
- `docs/CHANGELOG.md`
- `docs/CODEMAP.md`
- `.github/ISSUE_TEMPLATE/cpo_decision_required.yml`
- `.github/ISSUE_TEMPLATE/red_zone_override_required.yml`
- `.github/ISSUE_TEMPLATE/scheduler_blocked.yml`
- `src/App.tsx`
- `src/main.tsx`
- `src/version.ts`
- broad `src/sim/**`, `tests/**`, and `scripts/**`

Owner note: This bucket is too broad for a single cleanup action. Phase 2 should split it by lane or compare against accepted packets before any revert/archive decision.

### 8. `UNKNOWN_REQUIRES_OWNER_DECISION`

Primary unknown groups:

| Group | Count | Concern |
|---|---:|---|
| `_archive/duplicates/2026-05-06/**` | 389 | Archive/quarantine material is untracked; owner should decide preserve vs ignore/commit. |
| `docs/architecture/**` | 4 | Active canon docs are untracked and should be preserved. |
| `docs/product/**` active canon docs | 2 | Active canon docs are untracked and should be preserved. |
| `ops/v0.3/second_pass_contracts/**` | 20 | Active planning contracts per `SOURCE_STATUS_INDEX.md`; untracked but canon-relevant. |
| `ops/v0.3/catalog_disposition/**` | 4 | SP-017 canon/planning artifacts; untracked but directly relevant to v0.4 Local Matters. |
| active v0.3 canon/control docs | several | Includes `STOP_RULES.md`, `CODEX_CANON_HANDOFF_README.md`, `TRACEABILITY_MATRIX.md`, etc. |
| `SOURCE_STATUS_INDEX.md` | 1 | Active canon index is untracked. |

Owner note: This bucket should not be treated as generic debris. Several files are active canon or canon-planning inputs according to `SOURCE_STATUS_INDEX.md`.

## High-Risk Quarantine List

Do not touch without explicit PTL/CPO/CEO or lane-owner decision:

- Active backlog/progress:
  - `ops/v0.3/backlog.yaml`
  - `ops/v0.3/progress/latest.yaml`
- Schema/fixture/golden/baseline:
  - `docs/schemas/**`
  - `tests/fixtures/**`
  - `tests/goldenSeeds.test.ts`
  - any `*baseline*` or `*golden*` path
- Integrator-only or red-zone runtime:
  - `src/sim/turn.ts`
  - `src/sim/phases/phase_marriage.ts`
  - `src/sim/phases/phase_obligations.ts`
  - `src/sim/phases/phase_succession.ts`
  - broad `src/ui/**`
- Blocked/live-mechanic areas:
  - maintenance Coin/Labor paths
  - obligation collector/rebaseline paths
  - Food/store/meat/hunting mutation paths
  - A/R/T relationship mutation paths
  - marriage/succession/claims/regency/justice/coercion paths
- Active canon/control artifacts:
  - `SOURCE_STATUS_INDEX.md`
  - `docs/product/**`
  - `docs/architecture/**`
  - `ops/v0.3/second_pass_contracts/**`
  - `ops/v0.3/catalog_disposition/**`
  - `ops/v0.4/**`

## Active Engineering Review Packet

Yes, there is an active Engineering review packet:

- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`

It is untracked and should be preserved as part of the v0.4 control artifact set. The controlling PTL disposition is:

- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_REVIEW_DISPOSITION_2026-05-20.md`

Current status remains `RETURN_FOR_REVISION_NO_PTL_ACCEPTANCE`. The packet must not be treated as accepted evidence.

## Local Matters Boundary Assessment

Current Local Matters candidate implementation paths are inside the allowed path list from the dispatch:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts`
- `src/sim/domains/experience/localMatters.ts`
- `tests/sim/local_matters_live_tranche.test.ts`

However, the dirty checkout as a whole clearly violates the Local Matters dispatch boundary because it also contains dirty/untracked/deleted paths in:

- `src/sim/turn.ts`;
- broad `src/ui/**`;
- `tests/fixtures/**`;
- active `ops/v0.3/backlog.yaml` and `ops/v0.3/progress/latest.yaml`;
- schema, golden/baseline-adjacent, maintenance, obligation, Food, A/R/T, marriage, succession, and other red-zone paths.

The specific unclaimed activation/classification paths cited by PTL are not present in the current status snapshot, but the returned disposition remains authoritative until PTL/Engineering reconciles that discrepancy and issues a revised packet or decision.

## Recommended Cleanup Order

1. Preserve and isolate `V04_CONTROL_ARTIFACTS`.
   - Phase 2 candidate: PTL stages or commits only `ops/v0.4/**` control artifacts, including this cleanup report, as a standalone control-plane commit.
   - Do not bundle runtime/source/test changes with this control artifact commit.

2. Reconcile `LOCAL_MATTERS_CANDIDATE_SET`.
   - Phase 2 candidate: Engineering returns a revised packet or PTL decides whether current absence of activation/classification files resolves the prior blocker.
   - Keep Local Matters implementation review separate from repo cleanup.

3. Freeze `FORBIDDEN_OR_RED_ZONE_PATHS`.
   - Phase 2 candidate: produce a path-by-path owner decision table before any restore/delete/archive action.
   - Highest priority decisions: `ops/v0.3/backlog.yaml`, `ops/v0.3/progress/latest.yaml`, `src/sim/turn.ts`, `tests/fixtures/**`, `docs/schemas/**`, broad `src/ui/**`.

4. Separate active canon and canon-planning untracked files from generic debris.
   - Phase 2 candidate: PTL/canon owner decides whether to commit active canon/control docs such as `SOURCE_STATUS_INDEX.md`, `docs/product/**`, `docs/architecture/**`, `ops/v0.3/second_pass_contracts/**`, and `ops/v0.3/catalog_disposition/**`.

5. Review generated artifacts as evidence before deletion.
   - Phase 2 candidate: QA/Tooling classifies `qa_artifacts/**`, `test-results/**`, and `var/**` as accepted evidence, stale evidence, or disposable local output.
   - Any delete plan should be reversible and must not remove closure evidence referenced by control records.

6. Triage stale v0.3 artifacts.
   - Phase 2 candidate: PTL classifies `REVIEW_PACKET.md`, `ops/v0.3/implementation_readiness/**`, `ops/v0.3/progress/runs/**`, `docs/qa/**`, and duplicate-numbered docs into keep/commit, archive, or restore buckets.

7. Split broad runtime/UI/test churn by owner lane.
   - Phase 2 candidate: Engineering creates separate owner packets for world foundation, economy, people, UI, scripts/tooling, and tests.
   - Do not run blanket cleanup or blanket revert.

## Proposed Phase 2 Actions, Not Executed

Proposed only:

1. `PHASE2-A_CONTROL_ARTIFACT_PRESERVE`: Commit or otherwise preserve `ops/v0.4/**` as a standalone PTL control-plane bundle.
2. `PHASE2-B_LOCAL_MATTERS_REVISION`: Reconcile the returned Local Matters packet and current absence of event activation/classification dirty paths.
3. `PHASE2-C_RED_ZONE_OWNER_TABLE`: Create an owner-decision table for forbidden/red-zone paths before any filesystem action.
4. `PHASE2-D_GENERATED_ARTIFACT_DISPOSITION`: QA/Tooling marks generated artifacts as accepted evidence, stale evidence, or disposable local output.
5. `PHASE2-E_V03_STALE_ARCHIVE_PLAN`: PTL classifies v0.3 control/progress/QA artifacts and numbered duplicates for archive/restore/commit.
6. `PHASE2-F_BROAD_CHURN_SPLIT`: Split remaining runtime/UI/test/script/doc churn into lane-owned review packets.

No Phase 2 action is authorized by this report.

## Stop-Rule Assessment

- No source/runtime/test/schema/fixture/backlog file was edited by this task.
- No cleanup action was performed.
- No tests were run.
- No baseline/golden/fixture/schema update was performed.
- Red-zone and forbidden paths are identified for quarantine/decision.
- Active v0.4 control artifacts are preserved in inventory.
- Local Matters review remains separate from repo cleanup and remains unaccepted.

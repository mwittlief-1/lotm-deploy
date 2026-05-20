# V0_4_UNBLOCK_AND_NOTIFY_BUNDLE_001 Review Packet

Date: 2026-05-20
Status: `READY_FOR_PTL_CPO_CEO_REVIEW`
Classification: `PLANNING_DOCS_CONTROL_PLANE_ONLY`

## Scope

CPO/CEO approved v0.4 unblock and notification setup. This bundle sets up GitHub notification/control flow, completes the approved v0.4 safe planning queue, and prepares red-zone decision packets. It does not implement v0.4 features.

## Files Changed

Notification/control setup:

- `.github/ISSUE_TEMPLATE/cpo_decision_required.yml`
- `.github/ISSUE_TEMPLATE/red_zone_override_required.yml`
- `.github/ISSUE_TEMPLATE/scheduler_blocked.yml`
- `ops/v0.4/V0_4_NOTIFICATION_PROTOCOL.md`
- `ops/v0.4/V0_4_PTL_BLOCKER_PROTOCOL.md`
- `ops/v0.4/V0_4_PTL_BLOCKER_DASHBOARD.md`
- `ops/v0.4/README.md`

Safe planning queue:

- `ops/v0.4/safe_queue/V04_LEG_001_PLAYER_MENTAL_MODEL_CONTRACT.md`
- `ops/v0.4/safe_queue/V04_LEG_002_RECEIPT_EXPLANATION_VOCABULARY_AUDIT.md`
- `ops/v0.4/safe_queue/V04_QA_001_UAT_SCRIPT_PACKAGE.md`
- `ops/v0.4/safe_queue/V04_QA_002_SOFT_TIME_DEBT_TRACKING_PLAN.md`
- `ops/v0.4/safe_queue/V04_QA_003_EVIDENCE_BUNDLE_TEMPLATE.md`
- `ops/v0.4/safe_queue/V04_QA_004_PM_STORY_COVERAGE_KPI_MANIFEST.md`
- `ops/v0.4/safe_queue/V04_TOOL_001_SOURCE_STATUS_HYGIENE_PASS.md`
- `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`
- `ops/v0.4/safe_queue/V04_EST_001_OBLIGATION_CATALOG_COMPLETION.md`
- `ops/v0.4/safe_queue/V04_HOUSE_005_HIDDEN_SUBSTRATE_CANDIDATE_POOL_CONTRACT.md`

Red-zone decision packets:

- `ops/v0.4/red_zone/V04_RED_001_FIRST_RUNTIME_TRANCHE_SELECTION_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_LOCAL_MATTERS_LIVE_TRANCHE_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_MAINTENANCE_ECONOMY_TRANCHE_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_PRESET_INITIALIZATION_TRANCHE_PACKET.md`

Consolidated review:

- `ops/v0.4/V0_4_UNBLOCK_AND_NOTIFY_BUNDLE_001_REVIEW_PACKET.md`

## GitHub Labels / Templates / Issues

Labels verified on GitHub:

- `cpo-decision-required`
- `ceo-priority-required`
- `red-zone-override-required`
- `scheduler-blocked`
- `ptl-escalation`
- `safe-parallel-work`
- `v0.4-planning`

Templates created:

- `.github/ISSUE_TEMPLATE/cpo_decision_required.yml`
- `.github/ISSUE_TEMPLATE/red_zone_override_required.yml`
- `.github/ISSUE_TEMPLATE/scheduler_blocked.yml`

Smoke-test issue:

- `https://github.com/mwittlief-1/lotm-deploy/issues/22`
- Created, assigned to `mwittlief-1`, direct-mentioned `@mwittlief-1`, labeled, then closed as completed.

Active blocker issues:

- Guided tester boundary: `https://github.com/mwittlief-1/lotm-deploy/issues/23`
- First v0.4 runtime tranche: `https://github.com/mwittlief-1/lotm-deploy/issues/24`
- v0.4 active backlog activation: `https://github.com/mwittlief-1/lotm-deploy/issues/25`
- Actor accounting and fiscal bridge: `https://github.com/mwittlief-1/lotm-deploy/issues/26`
- Hidden seed and fiscal/labor visibility: `https://github.com/mwittlief-1/lotm-deploy/issues/27`

Each active blocker issue is assigned to `mwittlief-1` and directly mentions `@mwittlief-1`.

## Notification Protocol Status

Status: `ACTIVE`.

GitHub issue assignment plus direct mention is now the primary CPO/CEO push-notification mechanism for blockers. The blocker protocol requires first-line labels, issue URLs, exact decision text, options, PTL recommendation, blocked work, and safe parallel work.

## Safe Planning Outputs Completed

Completed as docs/proof/control-plane outputs:

- `V04-LEG-001` Player mental model contract.
- `V04-LEG-002` Receipt and explanation vocabulary audit.
- `V04-QA-001` v0.4 UAT script package.
- `V04-QA-002` Soft-time debt tracking plan.
- `V04-QA-003` Evidence bundle template for v0.4 lanes.
- `V04-QA-004` PM story coverage and KPI/cost-feel band manifest.
- `V04-TOOL-001` v0.4 source-status hygiene pass.
- `V04-LOCAL-001` Local Matters row package from SP-017 candidates.
- `V04-EST-001` Obligation catalog completion.
- `V04-HOUSE-005` Hidden substrate and candidate-pool provenance contract.

## Red-Zone Packet Paths

- `ops/v0.4/red_zone/V04_RED_001_FIRST_RUNTIME_TRANCHE_SELECTION_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_LOCAL_MATTERS_LIVE_TRANCHE_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_MAINTENANCE_ECONOMY_TRANCHE_PACKET.md`
- `ops/v0.4/red_zone/V04_RED_PRESET_INITIALIZATION_TRANCHE_PACKET.md`

## PTL Recommendation For First Red-Zone Tranche

Recommend `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE` as the first implementation authorization if CPO/CEO wants v0.4 implementation to begin.

Reasoning:

- strongest fit with `Legible Playable Pressure`;
- SP-017 gives an 11-row catalog-only candidate set;
- player value is immediate and inspectable;
- risk can be bounded more cleanly than opening economy-wide maintenance, preset initialization, full obligation rebasing, Food mutation, A/R/T mutation, or UI/turn wiring first.

## Unresolved CPO/CEO Decisions

- Guided tester boundary: issue #23.
- First red-zone runtime tranche: issue #24.
- v0.4 active backlog/scheduler activation: issue #25.
- Actor accounting tiers and world fiscal bridge boundary: issue #26.
- Hidden-world seed guarantee and nearby fiscal/labor visibility rules: issue #27.

## Proposed First v0.4 Implementation Lane After Approval

If CPO/CEO approves the PTL recommendation, first implementation lane should be:

`V04-LOCAL-LIVE-001 Local Matters first live mutation tranche`

Initial implementation should be narrow, SP-017-row-backed, deterministic, receipt/provenance-backed, and forbidden from broad UI/turn wiring, Food/Coin/Labor/Condition/Order/A/R/T/obligation/marriage/claims/justice mutation outside the exact selected scope.

## Boundary Confirmation

This bundle did not:

- implement v0.4 features;
- change runtime behavior;
- update schemas;
- update fixtures, goldens, or baselines;
- integrate UI;
- alter turn/phase wiring;
- reopen red-zone deferrals;
- edit `ops/v0.3/backlog.yaml`;
- mutate active backlog behavior.

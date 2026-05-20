# v0.4 Planning Workspace

Status: `PLANNING_INTAKE_OPEN_IMPLEMENTATION_NOT_AUTHORIZED`
Date: 2026-05-20

## Purpose

`ops/v0.4/` is the planning workspace for reconciling the closed v0.3 milestone, active canon, requirements scaffolds, old roadmap artifacts, and current product priorities into a v0.4 backlog.

This workspace is not an implementation authorization.

## Current Authority

Controlling direction:

- v0.3 is closed with soft-time performance/reliability debt recorded.
- CPO/CEO directs PTL/Engineering to begin v0.4 planning intake.
- v0.4 implementation is not authorized yet.

Primary inputs:

- `ops/v0.3/V0_3_CLOSURE_RECORD.md`
- `SOURCE_STATUS_INDEX.md`
- `AGENTS.md`
- `docs/product/PRODUCT_CONSTITUTION.md`
- `docs/product/V1_SCOPE_GUARDRAILS.md`
- `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`
- `docs/architecture/RUNTIME_RESET_CANON.md`
- `docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md`
- `docs/architecture/DETERMINISM_CONTRACT.md`
- `docs/product/REQUIREMENTS_REGISTER.md`
- `docs/product/CAPABILITY_MAP.md`
- `ops/v0.3/EPIC_MAP.md`
- `ops/v0.3/TRACEABILITY_MATRIX.md`
- `ops/v0.3/ACCEPTANCE_GATES.md`
- `docs/releases/v0.3_MASTER_BACKLOG_RECONCILIATION.md`
- `docs/releases/v0.3_SCOPE_DELTA_REPORT.md`
- `docs/releases/v0.3_RECOVERY_BACKLOG_TASK_GRAPH.md`
- `docs/releases/v0.3.7_PLAN.md`
- `ops/v0.3/implementation_readiness/IMPLEMENTATION_READINESS_MAP.md`

## Files

- `V0_4_PLANNING_INTAKE.md` - planning frame, inputs, rules, and tranche options.
- `V0_4_ROADMAP_RECONCILIATION.md` - old-roadmap reconciliation against v0.3 closure and active canon.
- `V0_4_BACKLOG_CANDIDATE_MAP.md` - candidate backlog map by v0.4 lane.
- `V0_4_RED_ZONE_CANDIDATES.md` - red-zone candidates and decision gates.
- `V0_4_SAFE_PARALLEL_WORK_QUEUE.md` - work that can proceed while red-zone decisions are pending.
- `V0_4_PTL_BLOCKER_PROTOCOL.md` - required blocker format and escalation behavior.
- `V0_4_PTL_BLOCKER_DASHBOARD.md` - current blocker dashboard.
- `V0_4_NOTIFICATION_PROTOCOL.md` - GitHub issue assignment, direct mention, label, and smoke-test protocol.
- `V0_4_REVIEW_PACKET.md` - consolidated planning packet for PTL/CPO/CEO review.
- `V0_4_UNBLOCK_AND_NOTIFY_BUNDLE_001_REVIEW_PACKET.md` - consolidated unblock/notification/safe-queue/red-zone packet.
- `V0_4_CPO_CEO_DECISION_LOG_2026-05-20.md` - recorded CPO/CEO issue dispositions.
- `V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT.md` - draft activation protocol authorized by issue #25, with no v0.3 backlog mutation.
- `V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md` - PTL dispatch packet for the authorized Local Matters first implementation frontier.
- `safe_queue/` - completed docs/proof outputs for the approved safe planning queue.
- `red_zone/` - decision packets for first runtime tranche selection and specific red-zone candidates.

## Operating Rules

- Do not implement v0.4 features.
- Do not change runtime behavior.
- Do not update schemas, fixtures, goldens, or baselines.
- Do not integrate UI.
- Do not alter turn/phase wiring.
- Do not reopen red-zone deferrals.
- Do not mutate `ops/v0.3/backlog.yaml` or active backlog behavior from this planning packet.

## Planning Classifications

Candidate items use these labels:

- `GREEN_READY` - safe planning or docs/proof work can proceed after normal PTL dispatch.
- `YELLOW_NEEDS_SPEC` - needs spec, catalog, or product decision before implementation.
- `RED_ZONE_DECISION_REQUIRED` - cannot implement without explicit CPO/CEO red-zone override.
- `DOCS_ONLY` - documentation, reconciliation, catalog, or packet work only.
- `PROOF_ONLY` - non-mutating proof/report/evidence work only.
- `IMPLEMENTATION_READY` - can become implementation after separate CPO/CEO/PTL dispatch; not authorized by this packet.

## Current PTL Recommendation

CPO/CEO authorized Local Matters first live mutation as the first v0.4 implementation frontier. Engineering may proceed only through `V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md` and must return a review packet before PTL acceptance.

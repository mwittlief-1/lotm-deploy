# v0.4 Roadmap Reconciliation

Date: 2026-05-20
Status: `PLANNING_RECONCILIATION`

## Purpose

This document reconciles the old v0.3/v0.3.7 roadmap and recovery graph against active canon and the closed v0.3 milestone. It identifies what remains valid, what v0.3 completed, what became canon/proof instead of runtime, what moves to v0.4, what should retire, and what needs CPO decision.

## Source Set

- `ops/v0.3/V0_3_CLOSURE_RECORD.md`
- `docs/releases/v0.3_SCOPE_LOCK.md`
- `docs/releases/v0.3.7_PLAN.md`
- `docs/releases/v0.3_MASTER_BACKLOG_RECONCILIATION.md`
- `docs/releases/v0.3_SCOPE_DELTA_REPORT.md`
- `docs/releases/v0.3_RECOVERY_BACKLOG_TASK_GRAPH.md`
- `docs/releases/v0.3_MANOR_EVENTS_INVENTORY.md`
- `docs/product/REQUIREMENTS_REGISTER.md`
- `docs/product/CAPABILITY_MAP.md`
- `ops/v0.3/EPIC_MAP.md`
- `ops/v0.3/TRACEABILITY_MATRIX.md`
- `ops/v0.3/implementation_readiness/IMPLEMENTATION_READINESS_MAP.md`

## Source Caveat

The root `README.md` and `ops/v0.3/progress/latest.yaml` are useful historical context, but they are not controlling v0.4 planning authority. `latest.yaml` still contains pre-closure caveat language in places; the newer CPO/CEO closure disposition and `ops/v0.3/V0_3_CLOSURE_RECORD.md` control closure status.

## What Remains Valid

- World-first source-truth hierarchy remains controlling.
- Receipts, provenance, player/debug separation, and determinism remain core acceptance requirements.
- The three-year turn envelope remains the working product frame.
- Estate/manor material loop remains central: Coin, Food, Labor Pressure, Condition, Order, obligations, improvements, and local pressure.
- CourtOS remains an execution/capacity layer, not the action taxonomy.
- Action registry rows remain state-changing process definitions, not UI buttons.
- Local Matters remain a high-value pressure surface, but live mutation remains blocked.
- A/R/T relationship memory remains product-critical, but live mutation remains blocked.
- Guided tester or v0.4 implementation work requires separate CPO/CEO approval.

## What v0.3 Completed

- Canon and source-status entrypoints are available and validated.
- Requirements, capability, epic, traceability, and acceptance-gate scaffolds exist.
- QA, preflight, UAT, ops, scheduler, canon, and replay gates passed for the final closure packet.
- Replay full-policy-vs-no-accept comparison semantics are repaired as reference-only evidence.
- v0.3.7 trust/playability closure work produced accepted evidence for ledger trust, marriage continuity, household/court actionability, player-language discipline, and evidence trust.
- v0.3 closed with soft-time performance/reliability debt recorded.

## What Became Canon/Proof Rather Than Runtime

- SP-001 numeric economy anchors are planning/proof/catalog authority only, not live economy authorization.
- SP-002 through SP-016 are planning contracts only, not runtime/schema/UI/fixture/golden authority.
- SP-017 Local Matters/action-row disposition is catalog planning authority only, not live incident mutation.
- Requirements/capability/epic/traceability maps are planning scaffolds, not active backlog or implementation authority.
- Non-mutating Food, obligation, Local Matters, A/R/T, CourtOS, turn pressure, lifecycle, and justice/coercion materials remain proof/spec/catalog paths until explicitly authorized.

## What Moves To v0.4

| Area | v0.4 Reframe | Primary Lane | Classification |
|---|---|---|---|
| Player mental model | Consolidate current receipts, ledgers, dossiers, briefings, and source labels into a player-facing model contract. | Player Legibility / Mental Model | `GREEN_READY`, `DOCS_ONLY` |
| Local Matters | Complete row package and pressure classification before live mutation. | Local Matters / Event Pressure | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` |
| Maintenance pressure | Decide whether first live Coin/Labor maintenance tranche opens. | Estate / Obligation / Maintenance | `RED_ZONE_DECISION_REQUIRED` |
| Lower-population/labor/staff model | Convert updated roadmap delta into read-model/spec work before live runtime. | Estate / Obligation / Maintenance | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` |
| Actor Fiscal State and XMAP fiscal seeding | Decide accounting tiers and fiscal bridge boundary before implementation. | Estate / Obligation / Maintenance | `YELLOW_NEEDS_SPEC`, `RED_ZONE_DECISION_REQUIRED` |
| Local labor shed and labor distress | Define seeded context and distinguish estate grievance from local labor distress. | Estate / Obligation / Maintenance | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` |
| Hidden substrate and candidate pools | Ratify minimum hidden-world seed contract for prior holders, candidates, claimants, and social pools. | Household / Dynasty Visibility | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` |
| Runtime presets | Decide if new-run preset initialization becomes live runtime behavior. | First Red-Zone Runtime Tranche | `RED_ZONE_DECISION_REQUIRED` |
| Obligation collector rebasing | Decide whether death/succession collector rebasing opens live. | First Red-Zone Runtime Tranche | `RED_ZONE_DECISION_REQUIRED` |
| Food sufficiency | Produce non-mutating proof scenarios before live Food mutation. | Estate / Obligation / Maintenance | `PROOF_ONLY` |
| A/R/T | Complete delta/caps/decay/consumer decision packet before live mutation. | First Red-Zone Runtime Tranche | `YELLOW_NEEDS_SPEC`, `RED_ZONE_DECISION_REQUIRED` |
| Marriage/succession/claims/regency | Reconcile v1-critical continuity with stop rules before runtime expansion. | Household / Dynasty Visibility | `RED_ZONE_DECISION_REQUIRED` |
| UAT materials | Build test scripts for v0.4 mental model and Local Matters/economy claims. | QA / UAT / Playtest Readiness | `GREEN_READY`, `DOCS_ONLY` |
| KPI/cost-feel bands | Prepare PM-anchored bands for staffing, support capacity, dowry, relief, scutage, and labor pressure. | QA / UAT / Playtest Readiness | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` |
| Source hygiene | Classify duplicate/historical docs and stabilize v0.4 planning references. | Tooling / Validation / Source Hygiene | `GREEN_READY`, `DOCS_ONLY` |

## What Should Retire

- Treating older v0.3 scope-lock language as controlling where it conflicts with active canon.
- Older 56-action framing.
- Using proof JSON, QA artifacts, or non-perturbation baselines as product/source truth.
- Treating the existing 62-event deck as final Local Matters backlog.
- Debug-only proof as acceptance for player-facing claims.
- Any assumption that v0.3 closure authorizes guided testers, v0.4 implementation, or red-zone runtime work.

## What Needs CPO Decision

- First v0.4 tranche strategy.
- Whether guided testers are planned now or remain blocked until after v0.4 planning.
- First red-zone runtime candidate, if any, to prepare for implementation authorization.
- Actor accounting tiers: ledgered, semi-ledgered, or abstract.
- World fiscal bridge boundary: what is seeded fiscal context, what is mutable runtime, and how XMAP/holding fabric feeds fiscal posture.
- Minimum hidden-world seed contract for prior holders, cadets/collateral scaffolds, claimant relevance, and social pools.
- Nearby fiscal/labor visibility rules: known by default, confidence-banded, or debug-only.
- Whether Local Matters should lead as catalog/proof first or live mutation first.
- Whether economy/maintenance live Coin/Labor opens before player-legibility cleanup.
- Whether runtime preset initialization is now important enough to reopen.
- Whether live obligation collector rebasing after death/succession is in the first v0.4 runtime tranche or remains deferred.

## Roadmap Summary

The old roadmap remains valuable as evidence and sequencing history, but v0.4 should not inherit it as an active implementation backlog. The strongest reconciliation is:

1. Keep v0.3 closure evidence as the baseline.
2. Promote active canon and requirements scaffolds into planning inputs.
3. Convert old roadmap items into v0.4 candidates with explicit classifications.
4. Start safe parallel planning work immediately.
5. Ask CPO/CEO for a tranche choice and any red-zone override before implementation.

# v0.4 Planning Intake

Date: 2026-05-20
Status: `PLANNING_INTAKE_OPEN_IMPLEMENTATION_NOT_AUTHORIZED`

## Executive Frame

v0.3 closed as a control-plane, canon, proof, and readiness milestone with soft-time performance/reliability debt recorded. v0.3 did not authorize live red-zone mechanics. v0.4 planning should decide which product value tranche moves first, what can proceed safely in parallel, and which red-zone runtime decisions CPO/CEO must make before implementation.

This intake creates a planning backlog. It does not dispatch implementation work.

## Planning Inputs

Active authority and planning sources:

- `ops/v0.3/V0_3_CLOSURE_RECORD.md`
- `SOURCE_STATUS_INDEX.md`
- `AGENTS.md`
- `docs/product/PRODUCT_CONSTITUTION.md`
- `docs/product/V1_SCOPE_GUARDRAILS.md`
- `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`
- `docs/architecture/RUNTIME_RESET_CANON.md`
- `docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md`
- `docs/architecture/DETERMINISM_CONTRACT.md`
- `ops/v0.3/STOP_RULES.md`
- `ops/v0.3/DECISION_AUTHORITY_MATRIX.md`
- `docs/product/REQUIREMENTS_REGISTER.md`
- `docs/product/CAPABILITY_MAP.md`
- `ops/v0.3/EPIC_MAP.md`
- `ops/v0.3/TRACEABILITY_MATRIX.md`
- `ops/v0.3/ACCEPTANCE_GATES.md`
- `docs/releases/v0.3_MASTER_BACKLOG_RECONCILIATION.md`
- `docs/releases/v0.3_SCOPE_DELTA_REPORT.md`
- `docs/releases/v0.3_RECOVERY_BACKLOG_TASK_GRAPH.md`
- `docs/releases/v0.3.7_PLAN.md`
- `docs/releases/v0.3_MANOR_EVENTS_INVENTORY.md`
- `ops/v0.3/implementation_readiness/IMPLEMENTATION_READINESS_MAP.md`

## Planning Rules

- Product target language is not implementation authority.
- Proof JSON and QA artifacts are evidence, not source truth.
- `ops/v0.3/backlog.yaml` remains read-only during this intake.
- Red-zone implementation requires explicit CPO/CEO authorization naming the runtime boundary.
- Safe parallel work should continue while decisions are blocked.
- Every proposed v0.4 implementation lane must include acceptance evidence, stop rules, and owner path boundaries before dispatch.

## v0.4 Candidate Lanes

The planning map uses these lanes:

1. Player Legibility / Mental Model
2. Local Matters / Event Pressure
3. Estate / Obligation / Maintenance
4. Household / Dynasty Visibility
5. First Red-Zone Runtime Tranche
6. QA / UAT / Playtest Readiness
7. Tooling / Validation / Source Hygiene

## Intake Findings

- v0.3 proved gate discipline, replay interpretation, source/canon validation, and closure-readiness evidence.
- v0.3 did not resolve soft-time replay performance debt.
- v0.3 preserved major red-zone deferrals: live maintenance Coin/Labor, runtime preset application, and live obligation collector rebasing after death/succession.
- Active canon says the strongest near-term player value is legibility around household, estate, obligations, Local Matters pressure, and receipts.
- The old scope-delta report identifies five product deltas to carry into v0.4: lower-population/labor/staff modeling, actor Fiscal State and XMAP fiscal seeding, local labor shed plus estate-grievance/local-labor-distress distinction, hidden substrate/candidate pools, and KPI/cost-feel bands.
- Most high-value gameplay expansion intersects red-zone mechanics; planning must isolate docs/proof/catalog precursors from live implementation.
- Old roadmap items that assumed immediate runtime implementation must be reframed as specs, catalog completion, proof packets, or red-zone decisions.
- `ops/v0.3/progress/latest.yaml` is useful history but is stale relative to the final CPO/CEO closure disposition; v0.4 planning should use `ops/v0.3/V0_3_CLOSURE_RECORD.md` as closure authority.

## Recommended v0.4 Tranche Strategies

### Option A: Legibility-First

First implementation lane after separate approval: Player Legibility / Mental Model.

Pros:

- Highest near-term user value with lowest red-zone exposure.
- Builds on v0.3 strengths: receipts, dossiers, obligations, evidence discipline.
- Clarifies what current systems mean before new mechanics add complexity.
- Supports guided tester readiness later without secretly opening red-zone runtime work.

Cons:

- Does not add much new simulation pressure by itself.
- May expose gaps that require later red-zone decisions.

Red-zone exposure:

- Low if limited to docs/proof/read-model contracts.
- UI integration still requires explicit approval before implementation.

### Option B: Local Matters-First

First implementation lane after separate approval: Local Matters catalog/proof, followed by a red-zone decision on live mutation.

Pros:

- Strong player-facing value: visible pressure, events, explanations, and estate texture.
- Builds a bridge from existing 62-event evidence to canon-classified Local Matters.
- Lets CPO/CEO decide what becomes interactive, automatic, hidden, or deferred.

Cons:

- Live incident mutation and response UI are red-zone.
- Requires careful event-class separation to avoid generic card-event gameplay.

Red-zone exposure:

- Medium to high for live mutation.
- Low for catalog completion and non-mutating probability/report proof.

### Option C: Economy/Maintenance-First

First implementation lane after separate approval: Estate / Obligation / Maintenance, beginning with spec and proof, then a narrow live maintenance Coin/Labor decision.

Pros:

- Directly addresses the most material landed-power loop: upkeep, obligations, labor pressure, and fiscal pain.
- Aligns with Product Constitution economy spine and v1 estate/manor material loop.
- Creates high-value pressure for later Local Matters and household decisions.

Cons:

- Highest red-zone exposure.
- Requires exact authorization for live Coin/Labor/Food/Condition/Order mutation boundaries.
- Higher baseline and determinism risk.

Red-zone exposure:

- High.
- Must not start implementation without CPO/CEO red-zone override.

## PTL Recommendation

PTL recommends Option A, Legibility-first, as the first v0.4 planning tranche. It provides useful player-facing clarity, keeps implementation risk controlled, and creates better acceptance criteria for later Local Matters and economy/maintenance runtime decisions.

In parallel, run safe docs/catalog/proof/tooling work from `V0_4_SAFE_PARALLEL_WORK_QUEUE.md` and prepare a CPO/CEO decision packet for the first red-zone runtime tranche.

## CPO/CEO Decisions Needed Next

1. Select the first v0.4 tranche strategy:
   - `V0_4_TRANCHE_LEGIBILITY_FIRST`
   - `V0_4_TRANCHE_LOCAL_MATTERS_FIRST`
   - `V0_4_TRANCHE_ECONOMY_MAINTENANCE_FIRST`
2. Decide whether guided testers remain blocked until after v0.4 planning, or whether a separate guided-test planning packet should be prepared.
3. Decide whether PTL should prepare a first red-zone runtime tranche decision packet now, and if so which candidate should lead:
   - live maintenance Coin/Labor;
   - runtime preset initialization;
   - live obligation collector rebasing;
   - live Local Matters mutation.
4. Decide the planning answers for actor accounting tiers, world fiscal bridge boundary, minimum hidden-world seed contract, and nearby fiscal/labor visibility rules.
5. Confirm that safe parallel work may proceed without mutating active v0.3 backlog behavior.

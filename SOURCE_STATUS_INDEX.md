# Source Status Index

**Status:** First-pass canon ingestion index for `LoTM_Final_Canon_Complete_Corpus_v0.1`
**Date:** 2026-05-15
**Purpose:** Tell future Codex runs which repo sources control current canon, which sources are evidence, and which sources must not be used as current implementation authority.

## Authority Order

1. Product Constitution / V1 Guardrails
2. Architecture / Runtime Spine
3. Domain Doctrines
4. Mechanical Specs
5. Catalog Seeds
6. Requirements / Codex Ops

When these sources conflict, higher layers control. A lower-layer source may refine, trace, or queue work, but it may not override product or runtime canon.

## ACTIVE_CANON

These are controlling canon or controlling Codex operating guardrails for current product interpretation.

- `SOURCE_STATUS_INDEX.md`
- `AGENTS.md`
- `docs/DUPLICATE_DOCS_STATUS.md`
- `docs/product/PRODUCT_CONSTITUTION.md`
- `docs/product/V1_SCOPE_GUARDRAILS.md`
- `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`
- `docs/architecture/RUNTIME_RESET_CANON.md`
- `docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md`
- `docs/architecture/DETERMINISM_CONTRACT.md`
- `ops/v0.3/CODEX_CANON_HANDOFF_README.md`
- `ops/v0.3/DECISION_AUTHORITY_MATRIX.md`
- `ops/v0.3/CODEX_AUTONOMY_LADDER.md`
- `ops/v0.3/STOP_RULES.md`

Domain doctrine files under `docs/product/domains/` are ACTIVE_CANON for doctrine and boundaries, subject to their inline status markers. `CANON_ACCEPTED` and `STRONG_DRAFT` material can guide requirements derivation. `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, and `RED_ZONE_BLOCKED` material does not authorize implementation.

Mechanical spec files under `docs/product/specs/` are ACTIVE_CANON as contracts and decision queues. They are not final formulas, live mutation authority, or schema-promotion authority unless the file explicitly says so and no stop rule applies. `docs/product/specs/ECONOMY_NUMERIC_HARMONIZATION_SPEC.md` now contains CPO-approved SP-001 numeric planning anchors, but those anchors do not authorize live economy behavior.

Catalog seed files under `docs/product/catalogs/` are ACTIVE_CANON as seed structures, category vocabularies, and row-status guidance. They are not complete final row sets unless explicitly accepted.

`ops/v0.3/second_pass_contracts/` contains the CPO-reviewed SP-BUNDLE-001 planning contracts. After CPO approval with amendments on 2026-05-16, SP-002 through SP-016 are ACTIVE_CANON as planning contracts only. They ratify doctrine/spec/catalog direction, catalog field expectations, and blocked-lane boundaries, but they are not runtime authority, schema authority, UI authority, turn-pipeline authority, test authority, fixture authority, or golden-baseline authority.

`ops/v0.3/catalog_disposition/` contains the CPO-reviewed SP-017 catalog disposition packet. After CPO approval with amendment on 2026-05-16, SP-017 is ACTIVE_CANON for docs/catalog planning only: 11 legacy event rows are v0.3 Local Matter candidate catalog rows, 41 rows are evidence only, 4 rows require rewrite as future action-outcome rows, 5 rows are deferred, 1 row is rejected/archived for v0.3, and action-row status bands are confirmed. SP-017 is not runtime, schema, UI, turn-pipeline, test, fixture, golden-baseline, incident-mutation, action-hook, or backlog authority.

Requirements and derivation scaffolds are ACTIVE_CANON for traceability workflow, not for product authority:

- `docs/product/CAPABILITY_MAP.md`
- `docs/product/REQUIREMENTS_REGISTER.md`
- `ops/v0.3/REQUIREMENTS_DERIVATION_PROTOCOL.md`
- `ops/v0.3/EPIC_MAP.md`
- `ops/v0.3/TRACEABILITY_MATRIX.md`
- `ops/v0.3/ACCEPTANCE_GATES.md`
- `ops/v0.3/TARGETED_SECOND_PASS_QUEUE.md`

## CONSOLIDATION_SOURCE

These sources may contain useful history, audits, proof evidence, or implementation inventory. They must be read through the ACTIVE_CANON hierarchy and cannot override it.

- `ops/v0.3/CODEX_END_TO_END_AUTONOMY_MODEL.md`
- `ops/v0.3/BACKLOG_CANON_SEED_v0.1.yaml`
- `ops/v0.3/backlog.yaml`
- `ops/v0.3/README.md`
- `ops/v0.3/progress/latest.yaml`
- `ops/v0.3/progress/runs/**`
- `docs/arch/WORLDGEN_FOUNDATION_*.md`
- `docs/arch/FOUNDATION_*.md`
- `docs/arch/XMAP_ALPHA_HANDOFF.md`
- `docs/arch/v0.3_REFACTOR_CHARTER.md`
- `docs/CANON_CORPUS_PATH_VALIDATION.md`
- `docs/product/CANON_CORPUS_PACKAGE_README.md`
- `docs/releases/v0.3_*.md`
- `docs/releases/v0.3.*.md`
- `docs/qa/v0.3*.md`
- `docs/ux/v0.3*.md`
- `docs/HOLDING_FABRIC_LEGAL_RULES_v0_1.md`
- `docs/schemas/hex_manor_data_models_current.md`

`ops/v0.3/backlog.yaml` remains the active automation queue in this checkout, but it is not product canon. The package file `ops/v0.3/BACKLOG.yaml` collided with the existing case-insensitive `ops/v0.3/backlog.yaml`; its content is preserved non-destructively as `ops/v0.3/BACKLOG_CANON_SEED_v0.1.yaml`. Do not overwrite the active queue with the seed backlog without a dedicated reconciliation task.

## SUPERSEDED_SOURCE

These sources are historical or older scope/control documents. Use them only to understand prior intent or migration history.

- `README.md` and `docs/README_START_HERE.md` for product/version framing; both still describe older v0.0.9/v0.1.0 starter context.
- `docs/releases/v0.3_SCOPE_LOCK.md` where it conflicts with the Final Canon corpus authority hierarchy.
- `docs/releases/v0.3_FISCAL_SPINE_PACKET.md` where it conflicts with the Final Canon economy doctrine or numeric harmonization queue.
- Older release plans and task lists under `docs/releases/v0.0.*`, `docs/releases/v0.2.*`, and early `docs/releases/v0.3.0_PLAN.md`.
- Older architecture reviews under `docs/arch/v0.2*.md`.
- Older QA gates, regression notes, and baselines under `docs/qa/v0.0*` and `docs/qa/v0.2*`.
- Older UX copy and hierarchy docs under `docs/ux/v0.2*`.

## ARCHIVE_ONLY

These sources are retained for forensic/history purposes only.

- `_archive/duplicates/**`
- `test-results/**`
- Historical zip/workpad/patchpack material under `_patchA/**`, `_patchB/**`, `kickoff/**`, `workpads/**`, and `dispatch_map/**`
- Deleted or quarantined duplicate artifacts referenced by git status

## DO_NOT_USE_FOR_CURRENT_CANON

Do not use these as current canon, implementation authority, schema authority, or source truth.

- Numbered duplicate files in active paths, such as `* 2.*`, `* 3.*`, and similar.
- Proof reports, generated QA JSON, screenshots, logs, and replay artifacts as product/runtime source truth.
- `qa_artifacts/**` as source truth. These are evidence only.
- `docs/golden_seeds_*.json` and non-perturbation baseline JSON as product canon.
- Legacy `RunState.manor` projections as source truth.
- The existing 62-event runtime deck as final canon backlog. It is evidence and classification input only.
- Any older "56 action" language. Current action-registry language uses the 78-row base canon plus explicit row-status bands.

## Unresolved Mechanics Stay Unresolved

The following areas remain unresolved or red-zone blocked unless a later approved task says otherwise:

- Economy implementation mechanics remain red-zone blocked even though SP-001 numeric planning anchors are approved: formulas, schedules, settlement behavior, stress/recovery mechanics, long-run equilibrium scenarios, and live resource/obligation behavior still require targeted authorization.
- Food sufficiency demand/store/shortage examples are ratified as non-mutating proof-scenario planning only; live Food mutation and final store math remain blocked.
- A/R/T hidden/banded taxonomy and planning frame are ratified, but live initialization, mutation, final deltas, decay, caps, and live consumers remain blocked.
- Marriage Opportunity, outbound pursuit, dowry application mechanics, and REC-053 follow-through remain blocked beyond the accepted v0.3 constraints. Hidden debt and A/R/T-modified dowry are explicitly disallowed.
- Claims enforcement, generalized succession runtime, regency, and wardship.
- Holding-fabric legal vocabulary and metadata planning are ratified, but schema promotion and XMAP integration details remain blocked.
- Local Matters catalog-only direction is ratified. SP-017 accepts 11 v0.3 Local Matter candidate rows as catalog-only planning rows, keeps 41 legacy rows as evidence, requires rewrite for 4 rows, defers 5 rows, and rejects/archives 1 row for v0.3. Future row packages must classify each candidate as `interactive`, `automatic_but_visible`, `background_visible`, or `background_hidden_evidence_only`. Live incident mutation remains blocked.
- Improvements, mills, franchise/right income, and upkeep timing remain planning-only. Mill/right/franchise income is receipt-intent/planning only; hidden base-income folding is disallowed.
- CourtOS coverage-first direction is ratified, but exact slot counts and live throughput changes remain blocked.
- S/D/P/I turn-pressure scenario planning is ratified, but `turn.ts` wiring and live turn-pipeline integration remain blocked.
- Knowledge confidence/provenance vocabulary and field planning are ratified, but UI/schema promotion and hidden-truth exposure remain blocked.
- Population/lifecycle projection-only direction is ratified, but live birth/death/fertility/mortality/lifecycle runtime remains blocked.
- Action registry/effects and obligation catalog frames are ratified as catalog-only planning. ACT-111-114 remain held pending justice/coercion guardrails, and no live dues, arrears, settlement, or resource mutation is authorized.
- Office/church/legitimacy, military readiness/service, and justice/coercion/order boundary contracts are ratified as guardrails only. They do not authorize global piety scores, church-family puppet behavior, tactical warfare, live service execution, live punishment, live coercion, or claims enforcement.

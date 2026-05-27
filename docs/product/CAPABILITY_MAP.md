# Capability Map v0.2

**Status:** First-pass requirements derivation from ACTIVE_CANON only.
**Date:** 2026-05-16
**Authority:** Requirements scaffold; not product canon and not implementation authorization.
**SP-001 ratification:** Economy numeric anchors approved for docs/proof/catalog planning on 2026-05-16; live implementation remains blocked.
**SP-BUNDLE-001 ratification:** SP-002 through SP-016 approved with amendments for docs/spec/catalog planning on 2026-05-16; live implementation remains blocked.

## Method

This map uses the authority order in `SOURCE_STATUS_INDEX.md`:

1. Product Constitution / V1 Guardrails
2. Architecture / Runtime Spine
3. Domain Doctrines
4. Mechanical Specs
5. Catalog Seeds
6. Requirements / Codex Ops

Capability rows inherit the source status of their highest controlling active-canon source. Rows marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED` are planning targets only.

## SP-BUNDLE-001 Planning Overlay

The bundle ratifies planning direction for Food, Marriage/Dowry/REC-053, Holding Fabric/XMAP, Local Matters, Improvements/Mill Rights, A/R/T, CourtOS, Turn Pressure, Knowledge/Receipts, Population/Lifecycle, Action Effects, Obligations, Office/Church, Military Service, and Justice/Coercion. This raises the affected capabilities to planning-ready where noted, but it does not authorize runtime implementation, schema promotion, UI integration, turn wiring, tests, fixtures, golden baselines, active backlog mutation, or live mechanics.

## Capability Map

| Capability ID | Derived capability | Source file(s) | Source status | Domain / epic | Requirement IDs | Implementation readiness | Blocking dependencies | Red-zone status | Required acceptance evidence |
|---|---|---|---|---|---|---|---|---|---|
| CAP-SPINE-001 | World-first source-truth spine | `docs/product/PRODUCT_CONSTITUTION.md`; `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`; `docs/architecture/RUNTIME_RESET_CANON.md` | ACTIVE_CANON / `CANON_ACCEPTED` | Architecture / `EPIC-WORLD-FIRST-RUNTIME` | REQ-SPINE-001, REQ-SPINE-002, REQ-SPINE-003 | Ready for docs/proof planning | Authorized proof lane before runtime changes | Source-truth mutation remains blocked | Layer-touch inventory, overlay/projection proof packet, no reverse-write evidence |
| CAP-EVID-001 | Receipt, provenance, and player-legible evidence stack | `docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md`; `docs/architecture/DETERMINISM_CONTRACT.md`; `docs/product/domains/KNOWLEDGE_RECEIPTS_DOCTRINE.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` | Architecture / `EPIC-KNOWLEDGE-RECEIPTS` | REQ-EVID-001, REQ-DET-001, REQ-KNOW-001 | Ready for docs/proof planning | Receipt taxonomy and confidence model before final schemas | Debug-as-player-explanation is blocked | Review packet showing receipts/provenance, player/debug separation, determinism checks |
| CAP-WORLD-001 | Home-manor and medium-realm context | `docs/product/V1_SCOPE_GUARDRAILS.md`; `docs/product/domains/WORLD_CONTEXT_HOLDING_FABRIC_DOCTRINE.md`; `docs/product/specs/HOLDING_FABRIC_LEGAL_RULES_SPEC.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `MECHANICAL_SPEC_NEEDED` | World / `EPIC-WORLD-CONTEXT` | REQ-WORLD-001, REQ-HOLD-001 | Legal vocabulary planning ready; schema blocked | Holding-fabric legal rules and exact schema | Schema promotion, XMAP integration, full mapgen/strategic-map expansion blocked | Deterministic home-manor context proof, medium-realm scale audit, holding-fabric RFI resolution |
| CAP-WORLD-002 | Tiered active world identity and fidelity | `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`; `docs/product/domains/TIERED_ACTIVE_WORLD_DOCTRINE.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `MECHANICAL_SPEC_NEEDED` | World / `EPIC-TIERED-WORLD` | REQ-TIER-001 | Ready for docs/proof planning; mechanics blocked | Promotion/demotion triggers and drift resolution | Full active-world simulation blocked | Identity preservation proof, promotion-as-resolution design packet, deterministic tier audit |
| CAP-ACTION-001 | Canonical action process registry | `docs/product/V1_SCOPE_GUARDRAILS.md`; `docs/product/domains/ACTION_REGISTRY_CANON.md`; `docs/product/catalogs/ACTION_REGISTRY.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `CATALOG_CONTENT` | Action / `EPIC-ACTION-REGISTRY` | REQ-ACTION-001, REQ-ACTION-002 | Ready for docs/catalog planning | Final row package and extension-row classification | Treating rows as UI buttons or live hooks is blocked | Row-status audit, obsolete 56-action reference check, action-row field completeness report |
| CAP-TURN-001 | Three-year turn envelope and pressure model | `docs/product/PRODUCT_CONSTITUTION.md`; `docs/product/domains/TURN_EXPERIENCE_DOCTRINE.md`; `docs/product/specs/TURN_PRESSURE_MODEL_SPEC.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `MECHANICAL_SPEC_NEEDED` | Turn / `EPIC-TURN-KERNEL-STAGED` | REQ-TURN-001, REQ-TURN-002 | Ready for non-integrated scenario planning; thresholds blocked | S/D/P/I threshold pass and cutpoint table | Live turn-pipeline integration and `turn.ts` wiring blocked | Turn-pressure scenario packet, pending-state table, no `turn.ts` integration evidence |
| CAP-COURT-001 | CourtOS capacity and delegation | `docs/product/domains/COURTOS_DOCTRINE.md`; `docs/product/specs/COURTOS_CAPACITY_MODEL_SPEC.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `MECHANICAL_SPEC_NEEDED` | CourtOS / `EPIC-COURTOS-CAPACITY` | REQ-COURT-001 | Coverage-first planning ready; exact units blocked | Slot counts, capacity units, penalty curves, delegation modifiers | Exact slot locking and live throughput changes blocked | Capacity model RFI, standing-coverage calibration scenarios, no live action-throughput change |
| CAP-STAND-001 | Standing coverage responsibilities | `docs/product/domains/STANDING_COVERAGE_DOCTRINE.md`; `docs/product/catalogs/STANDING_RESPONSIBILITIES_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `CATALOG_CONTENT` + `MECHANICAL_SPEC_NEEDED` | CourtOS / `EPIC-STANDING-COVERAGE` | REQ-STAND-001 | Coverage-lane planning ready; exact weights blocked | Lane catalog rows, coverage thresholds, penalty curves | Free automation and action-row collapse blocked | Coverage-lane catalog with implementation/status, minimum coverage matrix, receipt expectations for material coverage outcomes |
| CAP-HOUSE-001 | Household offices, roles, staff, and labor proof direction | `docs/product/domains/HOUSEHOLD_ROLES_LABOR_STAFF_DOCTRINE.md`; `docs/product/catalogs/OFFICE_CATALOG.md`; `docs/product/catalogs/TRAIT_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `CATALOG_CONTENT` + `MECHANICAL_SPEC_NEEDED` | Household / `EPIC-HOUSEHOLD-OFFICES` | REQ-HOUSE-001, REQ-OFFICE-001 | Ready for docs/proof planning; modifiers blocked | Office catalog, trait/action matrix, labor/staff modifier spec | Full household simulation blocked | Office/role distinction audit, vacancy consequence proof plan, grouped-staff abstraction statement |
| CAP-ECON-001 | Economy ledger and obligation spine | `docs/product/PRODUCT_CONSTITUTION.md`; `docs/product/domains/ECONOMY_OBLIGATION_DOCTRINE.md`; `docs/product/specs/ECONOMY_NUMERIC_HARMONIZATION_SPEC.md`; `docs/product/catalogs/OBLIGATION_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `MECHANICAL_SPEC_NEEDED` + `CATALOG_CONTENT` + `RED_ZONE_BLOCKED` | Economy / `EPIC-ECONOMY-LEDGER` | REQ-ECON-001, REQ-ECON-002, REQ-OBL-001 | Ready for docs/proof/catalog planning; implementation blocked | Obligation catalog completion, settlement authorization, stress/recovery and equilibrium scenarios | Live economy writes, dues, arrears, settlement blocked | SP-001 approved anchor table, non-mutating ledger/receipt plan, no live mutation evidence |
| CAP-FOOD-001 | Food sufficiency and provisioning legibility | `docs/product/domains/FOOD_PROVISIONING_DOCTRINE.md`; `docs/product/specs/FOOD_SUFFICIENCY_MECHANICS_SPEC.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `MECHANICAL_SPEC_NEEDED` + `RED_ZONE_BLOCKED` | Economy / `EPIC-FOOD-SUFFICIENCY` | REQ-FOOD-001 | Ready for docs/proof planning; implementation blocked | Storage, demand, carryover, shortage, emergency purchase, receipts | Live Food/store mutation blocked | Food sufficiency contract using 1 Food Unit = 30 bushels, bounded shortage scenarios, player-facing why report |
| CAP-IMPR-001 | Improvements, condition, and mill/franchise rights | `docs/product/specs/IMPROVEMENTS_MILL_RIGHTS_MECHANICS_SPEC.md`; `docs/product/catalogs/IMPROVEMENT_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `MECHANICAL_SPEC_NEEDED` + `CATALOG_CONTENT` + `RED_ZONE_BLOCKED` | Estate / `EPIC-IMPROVEMENTS-RIGHTS` | REQ-IMPR-001 | Ready for docs/catalog planning; implementation blocked | Improvement catalog, franchise/right separation, ROI/upkeep rules | Live mill/right income and hidden base-income folding blocked | Improvement row schema with 10-30 percent upkeep planning band, mill-right boundary proof, receipt-intent-only evidence |
| CAP-MARR-001 | Marriage opportunity, dowry, REC-053, and dynastic continuity | `docs/product/domains/MARRIAGE_SUCCESSION_CLAIMS_DOCTRINE.md`; `docs/product/specs/MARRIAGE_DOWRY_REC053_MECHANICS_SPEC.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `MECHANICAL_SPEC_NEEDED` + `RED_ZONE_BLOCKED` | Marriage / `EPIC-MARRIAGE-DYNASTY` | REQ-MARR-001, REQ-MARR-002, REQ-SUCC-001 | Ready for docs/proof planning; implementation blocked | Marriage Opportunity contract, dowry rank/quality application, succession/regency authorization | Live market, claims, generalized succession, regency blocked | Marriage contract packet using 30 Coin standard and 20-50 Coin band, hard-funding gate proof plan, REC-053 relationship-terms boundary evidence |
| CAP-DEMO-001 | Demography and lifecycle projection | `docs/product/domains/DEMOGRAPHY_LIFECYCLE_DOCTRINE.md`; `docs/product/specs/POPULATION_MODEL_SPEC.md`; `docs/product/catalogs/LIFECYCLE_EVENT_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `MECHANICAL_SPEC_NEEDED` + `CATALOG_CONTENT` + `RED_ZONE_BLOCKED` | Dynasty / `EPIC-DEMOGRAPHY-LIFECYCLE` | REQ-DEMO-001 | Ready for projection planning; live runtime blocked | Fertility/mortality/continuity bands and lifecycle catalog | Live birth/death/fertility/mortality runtime blocked | Projection report plan, preset definitions, explicit no-runtime-mutation evidence |
| CAP-ART-001 | A/R/T relationship memory | `docs/product/domains/ART_DOCTRINE.md`; `docs/product/specs/ART_MECHANICAL_MODEL_SPEC.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `MECHANICAL_SPEC_NEEDED` + `RED_ZONE_BLOCKED` | Relationships / `EPIC-ART-MEMORY` | REQ-ART-001 | Taxonomy planning ready; mechanics and live use blocked | Scale, delta bands, decay, caps, confidence, edge behavior | Live initialization/mutation and outcome effects blocked | A/R/T decision packet, action-delta matrix draft, REC-053 exception boundary |
| CAP-KNOW-001 | Knowledge confidence, dossiers, and provenance | `docs/product/domains/KNOWLEDGE_RECEIPTS_DOCTRINE.md`; `docs/product/specs/KNOWLEDGE_CONFIDENCE_MODEL_SPEC.md`; `docs/product/domains/UI_LEGIBILITY_CHRONICLE_DOSSIER_DOCTRINE.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `MECHANICAL_SPEC_NEEDED` | Knowledge / `EPIC-KNOWLEDGE-RECEIPTS` | REQ-KNOW-001, REQ-UI-001 | Ready for docs/proof planning; schema/UI blocked | Confidence acquisition/decay and dossier schema | UI integration, schema promotion, and hidden-truth exposure blocked | Confidence state table, dossier field RFI, player/debug explanation audit |
| CAP-INC-001 | Incident, Local Matters, and event taxonomy | `docs/product/domains/INCIDENT_EVENT_DOCTRINE.md`; `docs/product/catalogs/INCIDENT_CATALOG.md`; `docs/product/catalogs/LOCAL_MATTERS_CATALOG.md`; `docs/product/specs/INCIDENT_PROBABILITY_MODEL_SPEC.md` | ACTIVE_CANON / `STRONG_DRAFT` + `CATALOG_CONTENT` + `MECHANICAL_SPEC_NEEDED` + `RED_ZONE_BLOCKED` | Incidents / `EPIC-INCIDENT-LOCAL-MATTERS` | REQ-INC-001, REQ-LOCAL-001 | Ready for catalog planning; implementation blocked | 62-event classification, Local Matters subset, probability model | Live incident mutation and response UI blocked | Classification packet using SP-001 event pressure bands, no-op flavor rejection report, incident probability RFI |
| CAP-CHURCH-001 | Church, office, legitimacy, and records | `docs/product/domains/CHURCH_OFFICE_LEGITIMACY_DOCTRINE.md`; `docs/product/catalogs/OFFICE_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `MECHANICAL_SPEC_NEEDED` | Church / `EPIC-CHURCH-LEGITIMACY` | REQ-CHURCH-001 | Boundary planning ready; office mechanics blocked | Religious Standing and church office mechanics | Canon-law litigation, global piety score, and church-family puppet behavior blocked | Bishopric/bishop/person distinction audit, church office catalog draft, legitimacy RFI |
| CAP-MIL-001 | Military readiness and service as standing capacity | `docs/product/domains/MILITARY_SERVICE_DOCTRINE.md`; `docs/product/catalogs/STANDING_RESPONSIBILITIES_CATALOG.md`; `docs/product/catalogs/OBLIGATION_CATALOG.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + `CATALOG_CONTENT` | Military / `EPIC-MILITARY-SERVICE` | REQ-MIL-001 | Boundary planning ready; mechanics/catalog blocked | Readiness/service mechanics and obligation bands | Live service obligations, live service execution, and tactical warfare blocked | Readiness domain contract, service obligation catalog rows, cutpoint pressure plan |
| CAP-JUST-001 | Justice, coercion, crime, and order guardrails | `docs/product/domains/JUSTICE_COERCION_ORDER_DOCTRINE.md`; `docs/product/domains/ACTION_REGISTRY_CANON.md` | ACTIVE_CANON / `CANON_ACCEPTED` + `STRONG_DRAFT` + held rows | Justice / `EPIC-JUSTICE-COERCION` | REQ-JUST-001 | Guardrail planning ready; held rows still held | Held action disposition and CPO row release | Live unlawful coercion, punishment effects, legal claims enforcement blocked | Guardrail packet, held-row classification, moral-strategic risk assessment |
| CAP-CATALOG-001 | Canon catalog completion discipline | `docs/product/catalogs/*.md`; `SOURCE_STATUS_INDEX.md`; `ops/v0.3/STOP_RULES.md` | ACTIVE_CANON / `CATALOG_CONTENT` | Catalogs / `EPIC-CATALOG-COMPLETION` | REQ-CATALOG-001 | Blocked by catalog completion | Final row sets and source classification | Treating seed rows as final live content blocked | Catalog field completeness matrix, row status labels, no runtime import evidence |

## Readiness Buckets

### Ready For Docs/Proof Planning

- CAP-SPINE-001
- CAP-EVID-001
- CAP-WORLD-002, proof planning only
- CAP-ACTION-001, catalog planning only
- CAP-TURN-001, non-integrated proof planning only
- CAP-HOUSE-001, proof planning only
- CAP-ECON-001, numeric-anchor docs/proof/catalog planning only
- CAP-FOOD-001, non-mutating proof planning only
- CAP-IMPR-001, catalog planning only
- CAP-MARR-001, non-mutating contract planning only
- CAP-INC-001, catalog planning only
- CAP-DEMO-001, projection planning only
- CAP-KNOW-001, schema/RFI planning only
- CAP-CHURCH-001, boundary/office planning only

### Blocked By Mechanical Harmonization

- CAP-WORLD-001
- CAP-COURT-001
- CAP-STAND-001
- CAP-FOOD-001
- CAP-IMPR-001
- CAP-MARR-001
- CAP-DEMO-001, for model rates
- CAP-ART-001
- CAP-INC-001
- CAP-MIL-001

### Blocked By Catalog Completion

- CAP-ACTION-001, final row package
- CAP-STAND-001
- CAP-HOUSE-001, offices/traits
- CAP-OBLIGATION material inside CAP-ECON-001
- CAP-IMPR-001
- CAP-INC-001
- CAP-CATALOG-001

### Blocked By CPO Decision

- CAP-JUST-001, law/coercion/legitimacy guardrails
- Any schema promotion or product-default change

### Blocked By Red-Zone Implementation Rules

- Live economy/resource/obligation writes
- Live Food/store mutation
- Live A/R/T initialization/mutation
- Live marriage market, claims, generalized succession, regency, wardship
- Live incident mutation and Local Matters interaction
- UI integration
- Turn-pipeline integration
- Schema promotion
- Golden baseline updates

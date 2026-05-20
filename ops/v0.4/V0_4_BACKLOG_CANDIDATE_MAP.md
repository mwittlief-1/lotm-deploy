# v0.4 Backlog Candidate Map

Date: 2026-05-20
Status: `CANDIDATE_MAP_PLANNING_ONLY`

## Classification Legend

- `GREEN_READY` - safe planning or docs/proof work can proceed after normal PTL dispatch.
- `YELLOW_NEEDS_SPEC` - needs specification, catalog completion, or product decision before implementation.
- `RED_ZONE_DECISION_REQUIRED` - implementation requires explicit CPO/CEO red-zone authorization.
- `DOCS_ONLY` - documentation/reconciliation/catalog work only.
- `PROOF_ONLY` - non-mutating proof/report/evidence work only.
- `IMPLEMENTATION_READY` - can become implementation after separate dispatch; not authorized by this packet.

## Candidate Items

| ID | Lane | Candidate | Classification | Rationale | First Safe Deliverable |
|---|---|---|---|---|---|
| V04-LEG-001 | Player Legibility / Mental Model | Player mental model contract for current v0.3 systems | `GREEN_READY`, `DOCS_ONLY` | v0.3 closed with evidence, but player-facing meaning needs consolidation before new breadth. | Mental model doc mapping briefings, obligations, receipts, dossiers, and debug boundaries. |
| V04-LEG-002 | Player Legibility / Mental Model | Receipt and explanation vocabulary audit | `GREEN_READY`, `DOCS_ONLY` | Active canon requires narrative summary, structured effects, receipts, and debug separation. | Audit current terms and proposed v0.4 vocabulary. |
| V04-LEG-003 | Player Legibility / Mental Model | Source-truth labels for player vs debug evidence | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Hidden truth and confidence rails need a precise surface contract before UI integration. | Surface contract with Known/Likely/Possible/Debug-only labels. |
| V04-LEG-004 | Player Legibility / Mental Model | Guided mental-model UAT script | `GREEN_READY`, `DOCS_ONLY` | UAT materials can be prepared without running guided testers. | Script and expected-observation checklist. |
| V04-LOCAL-001 | Local Matters / Event Pressure | Local Matters row package from SP-017 candidates | `GREEN_READY`, `DOCS_ONLY` | SP-017 accepts 11 rows for catalog planning only. | Row table with visibility class, trigger evidence, receipt need, and stop-rule status. |
| V04-LOCAL-002 | Local Matters / Event Pressure | Legacy 62-event deck disposition cleanup | `GREEN_READY`, `DOCS_ONLY` | Existing deck is evidence, not final canon backlog. | Keep/evidence/rewrite/defer/reject matrix. |
| V04-LOCAL-003 | Local Matters / Event Pressure | Event pressure probability and reachability proof | `YELLOW_NEEDS_SPEC`, `PROOF_ONLY` | Probability model and pressure bands need non-mutating proof before live mutation. | Non-runtime report plan and deterministic scenario list. |
| V04-LOCAL-004 | Local Matters / Event Pressure | Live Local Matters mutation tranche | `RED_ZONE_DECISION_REQUIRED`, `IMPLEMENTATION_READY` | Live incident mutation and response UI are blocked. | CPO/CEO red-zone decision packet. |
| V04-EST-001 | Estate / Obligation / Maintenance | Obligation catalog completion | `GREEN_READY`, `DOCS_ONLY` | Obligation rows need authority basis, amount/band, recurrence, due timing, settlement/arrears status, and implementation status. | Catalog completeness matrix. |
| V04-EST-002 | Estate / Obligation / Maintenance | Maintenance pressure mechanics spec | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Live maintenance Coin/Labor remains deferred; spec is prerequisite. | Decision packet for cost, labor, condition, and receipt semantics. |
| V04-EST-003 | Estate / Obligation / Maintenance | Live recurring maintenance Coin/Labor tranche | `RED_ZONE_DECISION_REQUIRED`, `IMPLEMENTATION_READY` | Standing deferral `V03-R5-006-T02` remains in force. | Red-zone override request with narrow scope. |
| V04-EST-004 | Estate / Obligation / Maintenance | Food sufficiency non-mutating proof scenarios | `GREEN_READY`, `PROOF_ONLY` | Food mutation is blocked, but sufficiency scenarios are planning-ready. | Scenario report for demand/store/shortage/recovery language. |
| V04-EST-005 | Estate / Obligation / Maintenance | Actor fiscal posture planning contract | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Old roadmap calls for meaningful actor fiscal state, but actor accounting tiers need CPO choice. | Ledgered/semi-ledgered/abstract tier decision packet. |
| V04-EST-006 | Estate / Obligation / Maintenance | Lower-population, retained labor, and grouped staff model | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Scope delta report identifies lower-population and grouped staff as v0.4 carry-forward; live runtime remains unauthorized. | Read-model/spec packet for tenant households, retained labor, grouped staff, support burden, and readiness tradeoffs. |
| V04-EST-007 | Estate / Obligation / Maintenance | Local labor shed and labor-distress distinction | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | v0.4 needs map-linked labor context without jumping to live regional labor simulation. | Local labor shed boundary and estate-grievance/local-labor-distress vocabulary. |
| V04-EST-008 | Estate / Obligation / Maintenance | XMAP fiscal seeding bridge | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Actor fiscal state depends on how topology, rights, holdings, support capacity, food posture, and obligation load are seeded. | World fiscal bridge decision packet. |
| V04-HOUSE-001 | Household / Dynasty Visibility | Office, role, assignment, and grouped-staff catalog audit | `GREEN_READY`, `DOCS_ONLY` | Household/staff distinctions are planning-ready and needed before runtime. | Office/role/staff matrix. |
| V04-HOUSE-002 | Household / Dynasty Visibility | Dynasty visibility and unresolved-state contract | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Succession visibility matters, but generalized succession/regency is red-zone. | Visible successor/vacancy/acting-caretaker state vocabulary. |
| V04-HOUSE-003 | Household / Dynasty Visibility | Marriage/succession/claims/regency runtime tranche | `RED_ZONE_DECISION_REQUIRED`, `IMPLEMENTATION_READY` | Live marriage market, claims, generalized succession, regency, and wardship remain blocked. | CPO/CEO decision packet. |
| V04-HOUSE-004 | Household / Dynasty Visibility | A/R/T relationship memory decision matrix | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | A/R/T taxonomy is planning-ready; live mutation remains blocked. | Delta/caps/decay/consumer matrix proposal. |
| V04-HOUSE-005 | Household / Dynasty Visibility | Hidden substrate and candidate-pool provenance contract | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | v0.4 should strengthen prior-holder, claimant, retainer, church, professional, and marriage candidate sourcing before runtime expansion. | Minimum hidden-world seed contract and provenance audit. |
| V04-RED-001 | First Red-Zone Runtime Tranche | First red-zone runtime selection packet | `RED_ZONE_DECISION_REQUIRED`, `DOCS_ONLY` | CPO/CEO must choose whether to open maintenance, presets, obligations, Local Matters, Food, A/R/T, UI, or turn wiring. | Options packet with PTL recommendation and exact approval text. |
| V04-RED-002 | First Red-Zone Runtime Tranche | Runtime preset initialization decision | `RED_ZONE_DECISION_REQUIRED`, `IMPLEMENTATION_READY` | Standing deferral `V03-R5-009-T02` remains in force. | Narrow override packet for new-run preset application. |
| V04-RED-003 | First Red-Zone Runtime Tranche | Obligation collector rebasing after death/succession decision | `RED_ZONE_DECISION_REQUIRED`, `IMPLEMENTATION_READY` | Standing deferral `V03-R6-002-T03` remains in force. | Narrow override packet for collector rebasing. |
| V04-QA-001 | QA / UAT / Playtest Readiness | v0.4 UAT script package | `GREEN_READY`, `DOCS_ONLY` | Scripts can be prepared without starting guided testers. | Scenario scripts for mental model, obligations, household, Local Matters, and red-zone candidates. |
| V04-QA-002 | QA / UAT / Playtest Readiness | Soft-time debt tracking plan | `GREEN_READY`, `PROOF_ONLY` | v0.3 closed with soft-time debt; v0.4 should track it without treating it as drift. | Performance debt dashboard/report spec. |
| V04-QA-003 | QA / UAT / Playtest Readiness | Evidence bundle template for v0.4 lanes | `GREEN_READY`, `DOCS_ONLY` | v0.3 evidence discipline should carry forward. | Review packet and evidence bundle template. |
| V04-QA-004 | QA / UAT / Playtest Readiness | PM story coverage and KPI/cost-feel band manifest | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Scope delta report calls for cost-feel bands around support capacity, scutage, relief, dowry, staffing burden, and labor pressure. | Story coverage manifest and KPI band decision packet. |
| V04-TOOL-001 | Tooling / Validation / Source Hygiene | v0.4 source-status hygiene pass | `GREEN_READY`, `DOCS_ONLY` | Many historical docs and duplicates remain; source status needs clearer v0.4 routing. | Read-only source classification matrix. |
| V04-TOOL-002 | Tooling / Validation / Source Hygiene | v0.4 validation manifest planning | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | New validation commands/scripts would be implementation work; planning can define desired checks. | Manifest proposal, no script edits. |
| V04-TOOL-003 | Tooling / Validation / Source Hygiene | Active backlog transition protocol | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Active `ops/v0.3/backlog.yaml` must not be mutated in this intake. | Proposed v0.4 backlog activation protocol. |

## Candidate Summary By Lane

- Player Legibility / Mental Model: 4 candidates; 3 safe planning, 1 needs spec.
- Local Matters / Event Pressure: 4 candidates; 2 safe docs, 1 proof/spec, 1 red-zone implementation.
- Estate / Obligation / Maintenance: 8 candidates; 2 safe docs/proof, 5 spec, 1 red-zone implementation.
- Household / Dynasty Visibility: 5 candidates; 1 safe docs, 3 spec, 1 red-zone implementation.
- First Red-Zone Runtime Tranche: 3 candidates; all decision-gated.
- QA / UAT / Playtest Readiness: 4 candidates; 3 safe docs/proof, 1 spec.
- Tooling / Validation / Source Hygiene: 3 candidates; 1 safe docs, 2 spec/protocol.

## PTL Recommendation

Promote `V04-LEG-001`, `V04-LEG-002`, `V04-QA-001`, `V04-QA-002`, `V04-QA-003`, `V04-QA-004`, `V04-TOOL-001`, `V04-LOCAL-001`, `V04-EST-001`, and `V04-HOUSE-005` as the first safe planning queue after CPO/CEO confirms tranche strategy. Prepare `V04-RED-001` as the decision packet for the first implementation tranche, but do not implement it.

# v0.4 Red-Zone Candidates

Date: 2026-05-20
Status: `RED_ZONE_CANDIDATE_LIST_IMPLEMENTATION_BLOCKED`

## Rule

Every item in this document requires explicit CPO/CEO authorization before implementation. Planning, docs, and non-mutating proof may proceed only where separately classified as safe.

## Candidate List

| Candidate | Current Status | Why Red-Zone | Safe Precursor | Decision Needed |
|---|---|---|---|---|
| Live maintenance Coin/Labor | Deferred by `V03-R5-006-T02` | Live Coin/Labor/Condition pressure mutation intersects economy stop rules. | Maintenance mechanics spec and receipt semantics. | Authorize or keep deferred. |
| Runtime preset initialization | Deferred by `V03-R5-009-T02` | New-run preset application changes runtime initialization/defaults. | Preset contract and non-mutating fixture plan. | Authorize narrow preset initialization or keep deferred. |
| Live obligation collector rebasing after death/succession | Deferred by `V03-R6-002-T03` | Live obligation collector behavior after lifecycle/succession touches obligations and succession. | Collector state vocabulary and non-mutating rebasing proof. | Authorize narrow collector rebasing or keep deferred. |
| Live Local Matters mutation | Blocked | Incident mutation and response UI are blocked; existing event deck is evidence only. | Local Matters row package and probability proof. | Select live mutation scope or keep catalog-only. |
| Food mutation | Blocked | Live Food/store mutation is blocked by economy/resource stop rules. | Food sufficiency proof scenarios and receipt categories. | Authorize narrow live Food/store tranche or keep proof-only. |
| A/R/T mutation | Blocked | Live relationship memory initialization/mutation and outcome effects are blocked. | A/R/T delta/cap/decay matrix and consumer boundary. | Authorize narrow live A/R/T tranche or keep planning-only. |
| Marriage/succession/claims/regency | Blocked | Live marriage market, claims enforcement, generalized succession, regency, and wardship are blocked. | Dynasty visibility/unresolved-state contract. | Select narrow runtime tranche or keep deferred. |
| UI integration | Blocked | UI integration can imply source truth or hidden-truth exposure if not authorized. | Surface contract and player/debug truth split. | Authorize specific UI surface integration or keep docs/proof only. |
| Turn/phase wiring | Blocked | `turn.ts` and phase ordering are integrator/red-zone sensitive. | Non-integrated scenario plan and turn-pressure table. | Authorize exact integrator wiring or keep non-integrated. |
| Schema/golden/baseline updates | Blocked | Schema promotion and baseline/golden/fixture changes require owner proof and authority. | Row-level proof and update request packet. | Authorize exact file/update set or keep blocked. |

## Candidate Decision Text Templates

### Authorize Narrow Maintenance Tranche

`AUTHORIZE_V0_4_NARROW_LIVE_MAINTENANCE_COIN_LABOR_TRANCHE`

Scope must name allowed files, receipt expectations, deterministic gates, and explicit no-go boundaries for Food, obligations, turn wiring, UI, schemas, fixtures, goldens, and baselines unless separately included.

### Authorize Local Matters Catalog-Only

`AUTHORIZE_V0_4_LOCAL_MATTERS_CATALOG_AND_PROOF_ONLY_NO_LIVE_MUTATION`

Allows row package, probability proof, and UAT script preparation. Does not authorize live incident mutation or response UI.

### Authorize First Red-Zone Decision Packet Only

`AUTHORIZE_V0_4_FIRST_RED_ZONE_RUNTIME_TRANCHE_DECISION_PACKET_ONLY`

Allows PTL/Engineering to prepare options and exact approval language. Does not authorize implementation.

## PTL Recommendation

Do not open multiple red-zone runtime tranches at once. Prepare one red-zone decision packet after CPO/CEO selects the v0.4 tranche strategy. If no strategy is selected yet, keep all red-zone candidates blocked and continue safe parallel planning work.

# V04-RED-001 First Runtime Tranche Selection Packet

Date: 2026-05-20
Status: `CPO_CEO_DECISION_REQUIRED`
Classification: `RED_ZONE_DECISION_REQUIRED`, `DOCS_ONLY`
Notification label: `RED_ZONE_OVERRIDE_REQUIRED`

## Decision Needed

CPO/CEO must select the first v0.4 runtime tranche, if any, to open after safe planning acceptance. This packet prepares options only. It does not authorize implementation.

## PTL Recommendation

Recommend **Local Matters live mutation first**, after the safe planning queue is accepted.

Rationale: v0.4 thesis is `Legible Playable Pressure`. Local Matters offers the clearest first player-value jump: visible pressure, receipt-backed explanation, and bounded row selection. It is still red-zone work, but it can be scoped more narrowly than economy-wide maintenance, preset initialization, full obligation rebasing, Food mutation, A/R/T mutation, or UI/turn rewiring.

## Candidate Comparison

| Candidate | User value | Red-zone exposure | Dependencies | Pros | Cons | Exact approval text |
|---|---|---|---|---|---|---|
| Local Matters live mutation | High: makes pressure visible and playable. | Incident mutation, possible UI/turn/receipt touchpoints. | Row subset, write API, receipt classes, deterministic tests. | Best fit for `Legible Playable Pressure`; bounded 11-row candidate list. | Must avoid promoting all 62 legacy events or adding response UI without scope. | `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE` |
| Live maintenance Coin/Labor | High: material estate pressure. | Coin, Labor, Condition, receipt, balance risk. | Maintenance spec, ledger/write APIs, cost bands. | Directly supports landed material loop. | Higher balance/determinism risk; standing deferral exists. | `AUTHORIZE_V0_4_NARROW_LIVE_MAINTENANCE_COIN_LABOR_TRANCHE` |
| Runtime preset initialization | Medium-high: better new-run setup. | Runtime initialization/defaults, generated run state. | Preset contract, deterministic initialization proof. | Helps testability and scenario setup. | Less immediate play pressure; standing deferral exists. | `AUTHORIZE_V0_4_NARROW_RUNTIME_PRESET_INITIALIZATION_TRANCHE` |
| Obligation collector rebasing | Medium: fixes dead/vacant collector coherence. | Obligations plus lifecycle/succession adjacency. | Collector state vocabulary, successor/vacancy rules. | Important for trust and continuity. | Entangles with succession/tenure red zones. | `AUTHORIZE_V0_4_NARROW_OBLIGATION_COLLECTOR_REBASING_TRANCHE` |
| Food mutation | Medium-high: estate survival pressure. | Food/store mutation, economy, baselines. | Food sufficiency spec, receipt taxonomy. | Strong medieval material pressure. | Can snowball into economy rebalance. | `AUTHORIZE_V0_4_NARROW_LIVE_FOOD_MUTATION_TRANCHE` |
| A/R/T mutation | Medium-high: social consequence. | Relationship memory writes, consumer behavior. | Delta/cap/decay matrix, receipt rules. | Deepens people/world reaction. | Hard to tune; many consumers. | `AUTHORIZE_V0_4_NARROW_ART_RELATIONSHIP_MEMORY_TRANCHE` |
| UI/turn wiring | High eventually, low as first isolated tranche. | Production UI, turn/phase integration. | Surface contract, runtime data ready first. | Converts mechanics into visible play. | Dangerous if underlying mechanics are not ready. | `AUTHORIZE_V0_4_NARROW_UI_TURN_WIRING_TRANCHE` |

## Global Allowed Files For Decision Packet Only

- `ops/v0.4/**`
- `.github/ISSUE_TEMPLATE/**`
- GitHub issues/labels for blocker notification

## Global Forbidden Files Until Implementation Approval

- `src/**`
- `tests/**`
- `docs/schemas/**`
- `tests/fixtures/**`
- `docs/qa/*baseline*`
- `docs/**/golden*`
- `ops/v0.3/backlog.yaml`
- `ops/v0.3/progress/latest.yaml`
- runtime turn/phase wiring files
- production UI files

## Required First-Tranche Acceptance Frame

Any selected red-zone implementation packet must include:

- narrow scope and allowed paths;
- forbidden paths;
- write APIs required;
- receipt/provenance requirements;
- deterministic tests;
- baseline/golden/fixture policy;
- rollback/stop conditions;
- exact CPO/CEO approval text;
- safe substitute if not approved.

## Safe Substitute If No Runtime Tranche Is Approved

Approve `AUTHORIZE_V0_4_SAFE_PARALLEL_PLANNING_ONLY_CONTINUE` and continue docs/catalog/proof work:

- Local Matters row package and probability proof;
- obligation catalog completion;
- soft-time debt tracking;
- hidden substrate provenance contract;
- UAT materials;
- source-status hygiene;
- red-zone packet refinement.

## GitHub Blocker Issue

If CPO/CEO does not decide in-thread, create a GitHub issue assigned to `mwittlief-1`, mention `@mwittlief-1`, and label it `ptl-escalation`, `red-zone-override-required`, and `v0.4-planning`.

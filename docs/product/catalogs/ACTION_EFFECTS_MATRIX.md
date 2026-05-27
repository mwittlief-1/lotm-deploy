# Action Effects Matrix Seed


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`; SP-012 catalog-only planning is ratified for future design support only. SP-017 confirms action-row status bands for effect-matrix planning. SP-001 numeric anchors may be used for non-mutating planning rows. Do not implement effects until authorized.

Implementation/status: catalog/planning source only. This does not authorize implementation, runtime imports, schema promotion, UI integration, turn-pipeline wiring, tests/fixtures/goldens, or live mechanics.

## Required fields

- action id;
- normal/pressure context;
- Coin effect;
- Food effect;
- Labor Pressure effect;
- Condition effect;
- Order effect;
- Obligation effect;
- Knowledge effect;
- A/R/T hook;
- Chronicle/receipt rule;
- escalation/failure rule;
- implementation authorization status.

Every effect row must carry implementation/status and stop-rule status before future implementation planning.

## Approved economy planning anchors for effect rows

- 1 Coin = 30 bushels as planning/accounting equivalence only, not universal market price.
- 1 Food Unit = 30 bushels.
- Food remains distinct from Coin.
- Event pressure bands by annual gross support capacity:
  - routine: 0-5 percent;
  - local/serious: 5-15 percent;
  - serious: 15-30 percent;
  - crisis: 30-50 percent.
- Standard manor gross support is 20 Coin/year, with planning band 18-24 Coin/year.
- These anchors do not authorize live Coin, Food, obligation, A/R/T, incident, UI, or turn-pipeline effects.

## A/R/T note

For v0.3, REC-053 limits marriage relationship terms to clean/strained/blocked_by_relationship_terms and does not authorize candidate gating, dowry changes, or live deltas.

ACT-111-114 remain held pending justice/coercion guardrails and later CPO release. SP-012 does not authorize live hooks.

## SP-017 action-row status confirmation

| Segment | Effect-matrix handling |
|---|---|
| ACT-001-078 | Base canon planning rows may receive non-live effect-matrix drafts after row fields are complete. |
| ACT-079-089 | Integrated hospitality/status planning additions may receive non-live effect-matrix drafts after CPO confirms final labels, domains, core families, receipt requirements, and implementation/status fields. |
| ACT-090-095, ACT-101-104, ACT-116-117 | Tier A pressure additions remain v0.3 planning candidates; effect rows remain candidate-only. |
| ACT-096-100, ACT-105-110, ACT-115 | v0.8/v1 candidate appendix; do not treat as v0.3 effect implementation scope. |
| ACT-111-114 | Held; no effect rows may be drafted as implementation planning until later row-by-row justice/coercion/legitimacy CPO release. |

All effect rows remain blocked for live action hooks, resource mutation, A/R/T mutation, live obligations, live incident mutation, justice/coercion effects, UI integration, runtime schemas, and turn-pipeline wiring.

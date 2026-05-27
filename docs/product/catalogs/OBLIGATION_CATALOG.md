# Obligation Catalog Seed


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`; SP-001 numeric anchors and SP-013 catalog frame are approved for catalog planning.
`RED_ZONE_BLOCKED` for live obligations, dues, arrears, settlement, Food mutation, Coin mutation, UI integration, turn-pipeline integration, schemas, tests, fixtures, and golden baselines until separately authorized.

Implementation/status: catalog/planning source only. This does not authorize implementation, runtime imports, schema promotion, UI integration, turn-pipeline wiring, tests/fixtures/goldens, or live mechanics.

## Seed obligation types

- Tithe;
- scutage;
- relief;
- aids;
- dowry settlement;
- military service;
- court attendance;
- church patronage/dues;
- household wages/support;
- estate maintenance/upkeep;
- hospitality/status obligation;
- crisis relief.

## Approved v0.3 numeric planning anchors

These anchors may be used to complete catalog rows and proof plans. They do not authorize live obligation execution.

| Obligation area | Approved anchor | Notes |
|---|---|---|
| Tax | 1 Coin/year | Routine band 0.5-2 Coin/year. |
| Tithe | Goods-first, 2 Coin-equivalent/year | Approximately 60 bushels/year; current 5 percent production preview is runtime evidence, not product canon. |
| Scutage | 4 Coin event anchor | Ordinary band 2-6 Coin; per-fee scaling deferred until holding/fee mechanics are ready. |
| Relief | 10 Coin event anchor | Ordinary band 6-12 Coin; per-fee scaling deferred until holding/fee mechanics are ready. |
| Household service | 3 Coin/year | Planning anchor for household service support. |
| Grouped staff | 3-6 Coin/year | Planning band for grouped staff support. |
| Dowry settlement | Standard 30 Coin | Ordinary band 20-50 Coin; hard funding gate mandatory; no hidden debt, arrears, installments, land-backed settlement, dower, jointure, or debt instruments. |
| Improvement/franchise upkeep | 10-30 percent, working anchor 20 percent | Improvement/franchise-specific upkeep planning guidance, not an automatic whole-manor annual haircut. |
| Event pressure | Routine 0-5 percent; local/serious 5-15 percent; serious 15-30 percent; crisis 30-50 percent | Percentages are of annual gross support capacity. |

## Unit anchors

- 1 Coin = 30 bushels as planning/accounting equivalence only, not universal market price.
- 1 Food Unit = 30 bushels.
- Food remains distinct from Coin.

## Required fields

- obligation id;
- owed by;
- owed to;
- authority basis;
- form: Coin/Food/service/rights;
- recurrence;
- due timing;
- amount/band;
- deferral/refusal rules;
- relationship hooks;
- receipt rules;
- settlement/arrears status;
- implementation authorization.

Every obligation row must carry implementation/status. The SP-013 catalog frame does not authorize live dues, arrears, settlement, obligation execution, or resource mutation.

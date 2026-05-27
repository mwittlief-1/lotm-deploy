# Economy Numeric Harmonization Spec


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for the SP-001 approved numeric anchors below.
`MECHANICAL_SPEC_NEEDED` for formulas, timing, schedules, settlement behavior, stress/recovery mechanics, long-run equilibrium scenarios, and implementation contracts.
`RED_ZONE_BLOCKED` for live economy writes, Food mutation, obligations, dues, arrears, settlement, UI integration, turn-pipeline integration, schema promotion, tests, fixtures, and golden baselines until separately authorized.

## Problem

P2 and consolidation sources contained useful but conflicting numeric anchors for scutage, relief, fees, dowry, Coin/Food, and ordinary obligation costs. CPO approved the SP-001 anchor set on 2026-05-16 with the clarifications below.

## Approved v0.3 numeric anchors

These anchors are product planning canon. They do not authorize runtime behavior.

| Topic | Approved anchor | Clarification |
|---|---|---|
| Coin unit | 1 Coin = 30 bushels | Planning/accounting equivalence only, not a universal market price. |
| Food unit | 1 Food Unit = 30 bushels | Food remains distinct from Coin. |
| Standard gross support | 20 Coin/year | Gross support capacity, not net income. |
| Standard gross support planning band | 18-24 Coin/year | Planning band for ordinary manor support before expense/obligation schedules. |
| Standard starting treasury | 20 Coin | Fixture/proof anchor. |
| One-manor starting treasury band | 18-22 Coin | Do not retune until ordinary income, expenses, obligations, and receipts are wired truthfully. |
| Tax | 1 Coin/year | Routine band 0.5-2 Coin/year. |
| Tithe | Goods-first, 2 Coin-equivalent/year | Approximately 60 bushels/year under the approved Food Unit scale. |
| Scutage | 4 Coin event anchor | Ordinary band 2-6 Coin. |
| Relief | 10 Coin event anchor | Ordinary band 6-12 Coin. |
| Household service | 3 Coin/year | Planning anchor for household service support. |
| Grouped staff | 3-6 Coin/year | Planning band for grouped staff support. |
| Improvement/franchise upkeep | 10-30 percent, working anchor 20 percent | Improvement/franchise-specific upkeep planning guidance, not an automatic whole-manor annual haircut. |
| Dowry | Standard 30 Coin | Ordinary band 20-50 Coin; hard funding gate mandatory. |
| Event pressure | Routine 0-5 percent; local/serious 5-15 percent; serious 15-30 percent; crisis 30-50 percent | Percentages are of annual gross support capacity. |

## Clarifications

- The current 1 Coin / 10 bushels market-sale line is not canon.
- The current 5 percent production tithe preview is runtime evidence, not product canon.
- Per-fee scutage and relief scaling is deferred until holding/fee mechanics are ready.
- Dowry approval does not authorize hidden debt, arrears, installments, land-backed settlement, dower, jointure, or debt instruments.
- Food remains distinct from Coin even when an accounting equivalence is used.

## Deferred mechanics

| Topic | Conflicting anchors | Required decision |
|---|---|---|
| Coin/Food conversion | Approved as planning/accounting equivalence | Define market sale pricing separately. |
| Scutage | Approved event anchor; per-fee scaling deferred | Holding/fee mechanics required before per-fee model. |
| Relief | Approved event anchor; per-fee scaling deferred | Holding/fee mechanics required before per-fee model. |
| Dowry | Approved standard and ordinary band | Define rank/quality application without hidden debt or A/R/T mutation. |
| Ordinary manor support | Gross support approved | Define receipt rows, expenses, obligations, and recovery paths before retuning. |

## Remaining outputs needed

Later mechanical/catalog passes should produce:

- market sale pricing and receipt semantics;
- ordinary gross receipt bands;
- ordinary expense bands;
- obligation schedule bands;
- dowry application by rank/quality;
- relief/scutage/aids schedule rules;
- stress/recovery cost bands;
- balance test scenarios.

## Stop rule

Codex must not implement live economy values from this spec. Ratified numeric anchors authorize documentation, requirements, catalog, and proof planning only.

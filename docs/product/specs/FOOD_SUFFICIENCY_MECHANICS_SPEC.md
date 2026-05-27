# Food Sufficiency Mechanics Spec


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for SP-001 Food Unit and tithe planning anchors.
`CANON_ACCEPTED` for SP-002 non-mutating Food demand/store/shortage scenario planning.
`MECHANICAL_SPEC_NEEDED` for production, stores, carryover, demand, shortage, surplus, emergency purchase/relief, hunting/meat caps, and receipt mechanics.
`RED_ZONE_BLOCKED` for live Food/store mutation until authorized.

## Approved v0.3 anchors

- 1 Food Unit = 30 bushels.
- 1 Coin = 30 bushels as planning/accounting equivalence only, not universal market price.
- Food remains distinct from Coin.
- Tithe is goods-first, 2 Coin-equivalent/year, approximately 60 bushels/year.
- The current 5 percent production tithe preview is runtime evidence, not product canon.

## SP-002 ratified planning boundary

Demand, store, carryover, shortage, surplus, tithe, and emergency-purchase examples in this spec are planning and proof-scenario examples only. They must not be treated as live state mutation rules, final formulas, settlement behavior, or test/golden authority.

## Required outputs

- Baseline production/store model.
- Demand model for household/staff/guests/retainers.
- Carryover/spoilage/storage model.
- Shortage bands and consequences.
- Surplus handling.
- Emergency purchase/relief action hooks.
- Meat/hunting cap and risk.
- Tithe/goods obligation interface.
- Receipts for every material delta.

## v0.3 proof target

The player can tell whether the manor has enough food and why.

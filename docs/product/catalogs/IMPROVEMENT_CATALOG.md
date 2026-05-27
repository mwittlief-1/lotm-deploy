# Improvement Catalog Seed


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`; SP-001 improvement/franchise upkeep anchors and SP-006 mill/right/franchise boundaries are approved for catalog planning.
`RED_ZONE_BLOCKED` for live income/effect mechanics, hidden base-income folding, live Coin mutation, schema promotion, UI integration, and turn-pipeline integration until separately authorized.

## Doctrine

Improvements are estate facts. Starting manors may have inherited improvements, rights, liabilities, practices, or degraded assets.

## Required fields

- id;
- name;
- asset/right/practice/liability;
- location scope;
- exists-at-start eligibility;
- build/repair/maintain actions;
- upkeep;
- condition interaction;
- food effect;
- coin effect;
- labor effect;
- order/relationship effect;
- geography dependency;
- receipts;
- implementation authorization.

Every catalog row must carry implementation authorization/status before it can be used for future implementation planning.

## Approved upkeep planning anchor

- Improvement/franchise upkeep planning band: 10-30 percent.
- Working anchor: 20 percent.
- This is improvement/franchise-specific upkeep planning guidance, not an automatic whole-manor annual haircut.
- Upkeep anchors may inform catalog rows and proof plans, but do not authorize live upkeep mutation.

## Mill rule

Current `mill_efficiency` is sale-conversion/efficiency only, not live franchise income.

Mill/right/franchise income remains receipt-intent/planning only. No row may fold hidden mill or franchise value into base manor income without a later approved mechanic.

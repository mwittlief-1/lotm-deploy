# Improvements and Mill Rights Mechanics Spec


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for SP-001 improvement/franchise upkeep planning anchors.
`CANON_ACCEPTED` for SP-006 mill/right/franchise receipt-intent planning boundary.
`MECHANICAL_SPEC_NEEDED` for improvement row mechanics, ROI, build/repair/maintain timing, Food/Coin/Condition/Labor effects, and franchise/right separation.
`RED_ZONE_BLOCKED` for live mill/right income, hidden base-income folding, live Coin mutation, schema promotion, UI integration, and turn-pipeline integration.

## Accepted doctrine

Improvements are durable estate facts, not only construction/build menu rows. Starting manors may have inherited assets, practices, rights, or liabilities.

Mills are more naturally tied to villages/catchments than manor-house slots.

## Current boundary

REC-032/current mill-right behavior is receipt-intent only:

- no live Coin mutation;
- no hidden base-income folding;
- no geography-derived throughput;
- no franchise substitution.

`mill_efficiency` remains sale-conversion/efficiency, not live franchise income.

SP-006 ratifies mill/right/franchise income as receipt-intent and planning only. It does not authorize hidden income, hidden base-income folding, or automatic income integration into manor support.

## Approved upkeep planning anchor

- Improvement/franchise upkeep planning band: 10-30 percent.
- Working anchor: 20 percent.
- This is improvement/franchise-specific upkeep planning guidance, not an automatic whole-manor annual haircut.
- These anchors do not authorize live upkeep mutation, hidden income, or base-income folding.

## Required future outputs

- Improvement catalog fields.
- Existing-at-start logic.
- Build/repair/maintain/upkeep rules.
- ROI bands.
- Food/Coin/Condition/Labor effects.
- Franchise/right separation.
- Receipt rules.

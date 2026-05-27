# Population and Demography Model Spec


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for SP-011 projection-only planning direction.
`MECHANICAL_SPEC_NEEDED`. This doc records required model dimensions and provisional routing, not final rates.

## Model targets to define

- Long-run commoner/labor population growth target.
- Baseline noble-house continuity/extinction rate.
- Fertility assumptions by marriage age and status.
- Birth interval assumptions.
- Maternal mortality and child survival assumptions.
- Adult mortality assumptions.
- Widowhood and remarriage likelihood.
- Clerical placement rates.
- Cadet/collateral succession frequency.
- Minor-heir/regency incidence.

## Projection outputs

Required reports:

- 50-year projection;
- 100-year projection;
- 216-year / 72-turn benchmark projection if used;
- house continuity/extinction distribution;
- heir scarcity/abundance distribution;
- collateral branch availability;
- visible T1 continuity report;
- labor/commoner drift report.

## Preset directions

- `stable_conservative`;
- `standard_v1`;
- `eventful_high_variance`.

## Stop rule

Projection tests are not live lifecycle runtime.

SP-011 does not ratify live birth/death/fertility/mortality runtime, final demographic rates, or turn-pipeline lifecycle integration.

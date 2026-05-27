# Name Bank and Onomastics Spec


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT` and `MECHANICAL_SPEC_NEEDED`; may require fresh historical research.

Implementation/status: catalog/planning source only. This does not authorize implementation, runtime imports, schema promotion, UI integration, turn-pipeline wiring, tests/fixtures/goldens, or live mechanics.

## Purpose

Names should make the world feel historically grounded, regionally coherent, and socially differentiated without becoming unreadable antiquarianism.

## Required coverage

- given names by gender/usage;
- clerical names;
- house names;
- manor/place names;
- village names;
- county/bishopric names;
- nickname/byname patterns;
- toponymic patterns;
- rank/culture/region weighting;
- rare/common weighting;
- dynastic repetition rules;
- spelling variant policy.

## Data fields

- name;
- type;
- culture/region;
- gender/usage;
- rank weighting;
- century weighting;
- rarity;
- clerical suitability;
- notes/source.

# Action Registry Catalog Seed


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`. SP-012 catalog-only planning is ratified. SP-017 confirms the action-row status bands. This file defines the row-status structure. It does not reproduce every row from the source extraction.

## Row-status structure

| Segment | Status | Canon handling |
|---|---|---|
| ACT-001-078 | Base Canon | Accepted registry seed; SP-017 confirms as base canon planning rows. |
| ACT-079-089 | Integrated Canon Add | Hospitality/status additions; SP-017 confirms as integrated hospitality/status planning additions. |
| ACT-090-095, ACT-101-104, ACT-116-117 | Tier A Pressure Additions | v0.3 planning candidates for final packaging; not live hooks. |
| ACT-096-100, ACT-105-110, ACT-115 | Candidate v0.8/v1 | Keep in candidate appendix. |
| ACT-111-114 | Held | Remain held pending later row-by-row justice/coercion/legitimacy CPO decision. |

## Required row fields

- id;
- label;
- domain;
- core family;
- actor class;
- target class;
- authority basis;
- preconditions;
- resource costs;
- capacity/coverage linkage;
- time horizon;
- risk;
- possible outcomes;
- receipt requirements;
- A/R/T hook status;
- pressure tags;
- implementation status;
- stop-rule status.

Older 56-action language is obsolete. Every row must keep implementation/status explicit before any future implementation planning.

SP-017 confirmation is docs/catalog planning only. It does not authorize live action hooks, resource mutation, A/R/T mutation, UI action surfaces, runtime schema promotion, turn-pipeline integration, or release of held rows.

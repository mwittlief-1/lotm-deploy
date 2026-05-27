# Knowledge Confidence Model Spec


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for SP-010 confidence/provenance vocabulary and field planning.
`MECHANICAL_SPEC_NEEDED` for acquisition, decay, dossier schema, stale/false-intel rules, and UI/schema integration.

## Confidence states

Core states:

- Known;
- Likely;
- Possible;
- Rumored;
- Stale;
- Unknown.

## Required model decisions

- How confidence is acquired.
- How confidence decays.
- Which offices/roles update knowledge passively.
- How correspondence transmits knowledge.
- How succession changes what the new head knows.
- How false intel is represented in v1.
- How player-facing uncertainty differs from debug truth.

## Stop rule

Do not expose hidden truth through UI/read models without confidence/provenance handling.

SP-010 does not authorize UI integration, schema promotion, or player-facing hidden-truth exposure.
